import { Hono } from 'hono';
import { createUIMessageStream, createUIMessageStreamResponse, streamText, convertToModelMessages, UIMessage, stepCountIs } from 'ai';
import { createMCPClient, type MCPClient } from '@ai-sdk/mcp';
import { Experimental_StdioMCPTransport as StdioClientTransport } from '@ai-sdk/mcp/mcp-stdio';
import { cors } from 'hono/cors';
import { getAppConfigPath, getConfiguredMcpServers, type MCPServerConfig } from './mcp-config';

const app = new Hono();
const MCP_STATUS_CACHE_TTL_MS = Number(process.env.MCP_STATUS_CACHE_TTL_MS ?? process.env.MCP_DOCKER_STATUS_CACHE_TTL_MS ?? 15000);
const MCP_RUNTIME_ENABLED = process.env.MCP_DOCKER_ENABLED !== 'false';

type MCPStatusResponse = {
  enabled: boolean;
  status: 'enabled' | 'disabled' | 'fallback';
  tools: string[];
  reason?: string;
  configPath?: string;
  servers?: string[];
};

type MCPToolSet = Awaited<ReturnType<MCPClient['tools']>>;
type MCPServerRuntime = {
  client?: MCPClient;
  tools?: MCPToolSet;
  pending?: Promise<MCPToolSet | undefined>;
  lastError?: string;
  lastInitAt?: number;
};

const mcpRuntime: {
  servers: Map<string, MCPServerRuntime>;
  lastError?: string;
  lastInitAt?: number;
} = {
  servers: new Map<string, MCPServerRuntime>(),
};

function normalizeServerEnv(env?: Record<string, string>): Record<string, string> | undefined {
  if (!env || typeof env !== 'object') {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(env).filter(
      (entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string',
    ),
  );
}

async function createConfiguredMCPClient(serverName: string, serverConfig: MCPServerConfig): Promise<MCPClient> {
  const transportType = serverConfig.transport ?? (serverConfig.url ? 'url' : 'stdio');

  if (transportType === 'url' || serverConfig.url) {
    const targetUrl = serverConfig.url?.trim();
    if (!targetUrl) {
      throw new Error(`MCP server "${serverName}" uses URL transport but is missing required field "url".`);
    }

    const command = serverConfig.command?.trim() || 'npx';
    const args = Array.isArray(serverConfig.args) && serverConfig.args.length > 0
      ? serverConfig.args
      : ['-y', 'mcp-remote', targetUrl];

    const transport = new StdioClientTransport({
      command,
      args,
      env: normalizeServerEnv(serverConfig.env),
    });

    return createMCPClient({ transport });
  }

  if (!serverConfig.command) {
    throw new Error(`MCP server "${serverName}" is missing required field "command".`);
  }

  const transport = new StdioClientTransport({
    command: serverConfig.command,
    args: Array.isArray(serverConfig.args) ? serverConfig.args : [],
    env: normalizeServerEnv(serverConfig.env),
  });

  return createMCPClient({ transport });
}

async function closeServerRuntime(runtime: MCPServerRuntime | undefined): Promise<void> {
  if (!runtime?.client) {
    return;
  }

  await runtime.client.close().catch(() => undefined);
}

async function resetMCPRuntime(): Promise<void> {
  await Promise.all(
    Array.from(mcpRuntime.servers.values()).map((runtime) => closeServerRuntime(runtime)),
  );

  mcpRuntime.servers.clear();
  mcpRuntime.lastError = undefined;
}

function toMergedToolName(serverName: string, toolName: string): string {
  const normalize = (value: string): string =>
    value
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'tool';

  // OpenAI tool names must match ^[a-zA-Z0-9_-]+$.
  return `${normalize(serverName)}__${normalize(toolName)}`;
}

function mergeServerTools(serverTools: Array<[string, MCPToolSet]>): MCPToolSet {
  const mergedEntries: Array<[string, any]> = [];

  for (const [serverName, tools] of serverTools) {
    for (const [toolName, toolDef] of Object.entries(tools)) {
      mergedEntries.push([toMergedToolName(serverName, toolName), toolDef]);
    }
  }

  return Object.fromEntries(mergedEntries) as MCPToolSet;
}

async function ensureToolsForServer(
  serverName: string,
  serverConfig: MCPServerConfig,
  forceRefresh = false,
): Promise<MCPToolSet | undefined> {
  const runtime = mcpRuntime.servers.get(serverName) ?? {};
  if (forceRefresh) {
    await closeServerRuntime(runtime);
    runtime.client = undefined;
    runtime.tools = undefined;
    runtime.pending = undefined;
  }

  if (runtime.tools) {
    mcpRuntime.servers.set(serverName, runtime);
    return runtime.tools;
  }

  if (runtime.pending) {
    mcpRuntime.servers.set(serverName, runtime);
    return runtime.pending;
  }

  const pending = (async () => {
    const client = await createConfiguredMCPClient(serverName, serverConfig);
    const tools = await client.tools();

    runtime.client = client;
    runtime.tools = tools;
    runtime.lastError = undefined;
    runtime.lastInitAt = Date.now();

    return tools;
  })()
    .catch((error) => {
      runtime.lastError = error instanceof Error ? error.message : String(error);
      return undefined;
    })
    .finally(() => {
      runtime.pending = undefined;
    });

  runtime.pending = pending;
  mcpRuntime.servers.set(serverName, runtime);
  return pending;
}

function wrapToolsWithProgressEvents(
  tools: MCPToolSet,
  writer: { write: (chunk: unknown) => void },
): MCPToolSet {
  const wrappedEntries = Object.entries(tools).map(([toolName, toolDef]) => {
    const wrappedTool = {
      ...toolDef,
      execute: async (...args: any[]) => {
        const input = args[0] ?? {};
        const startedAt = Date.now();

        writer.write({
          type: 'data-custom',
          data: {
            mcpEvent: {
              phase: 'tool-start',
              toolName,
              input,
              startedAt,
            },
          },
        });

        try {
          const result = await Promise.resolve(
            (toolDef.execute as (...innerArgs: any[]) => unknown).apply(toolDef, args),
          );
          writer.write({
            type: 'data-custom',
            data: {
              mcpEvent: {
                phase: 'tool-end',
                toolName,
                finishedAt: Date.now(),
                durationMs: Date.now() - startedAt,
              },
            },
          });
          return result;
        } catch (error) {
          writer.write({
            type: 'data-custom',
            data: {
              mcpEvent: {
                phase: 'tool-error',
                toolName,
                finishedAt: Date.now(),
                durationMs: Date.now() - startedAt,
                errorText: error instanceof Error ? error.message : String(error),
              },
            },
          });
          throw error;
        }
      },
    };

    return [toolName, wrappedTool];
  });

  return Object.fromEntries(wrappedEntries) as MCPToolSet;
}

function tokenize(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9_\s-]/g, ' ')
        .split(/[\s_-]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3),
    ),
  );
}

function getToolSearchText(toolName: string, toolDef: unknown): string {
  const title = (toolDef as { title?: unknown })?.title;
  const description = (toolDef as { description?: unknown })?.description;

  return [toolName, title, description]
    .filter((value) => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase();
}

function selectActiveMCPTools(tools: MCPToolSet | undefined, latestUserText: string, maxTools = 8): string[] | undefined {
  if (!tools) {
    return undefined;
  }

  const toolEntries = Object.entries(tools);
  if (toolEntries.length === 0) {
    return undefined;
  }

  const queryTokens = tokenize(latestUserText);
  if (queryTokens.length === 0) {
    return undefined;
  }

  const scoredTools = toolEntries
    .map(([toolName, toolDef]) => {
      const haystack = getToolSearchText(toolName, toolDef);
      const score = queryTokens.reduce((acc, token) => {
        if (haystack.includes(token)) {
          return acc + (toolName.includes(token) ? 3 : 1);
        }

        return acc;
      }, 0);

      return {
        toolName,
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxTools)
    .map((item) => item.toolName);

  if (scoredTools.length > 0) {
    return scoredTools;
  }

  // Fallback: choose likely scanner-style tools from whatever MCP currently exposes.
  const fallbackTools = toolEntries
    .map(([toolName]) => toolName)
    .filter((toolName) => /scan|recon|harvest|dns|nmap|gobuster|enum/i.test(toolName))
    .slice(0, maxTools);

  return fallbackTools.length > 0 ? fallbackTools : undefined;
}

function getLatestUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== 'user' || !Array.isArray(message.parts)) {
      continue;
    }

    const text = message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join(' ')
      .trim();

    if (text) {
      return text;
    }
  }

  return '';
}

function isLikelySecurityToolIntent(text: string): boolean {
  const normalized = text.toLowerCase();
  if (!normalized) {
    return false;
  }

  return /(scan|scanner|recon|enumerat|sub\s*domain|subdomain|subfinder|dns|nmap|gobuster|harvester|nikto|dirb|ffuf|sqlmap|whois|port\s*scan|vuln|vulnerability|osint)/i.test(normalized);
}

function normalizeModelId(rawModelId?: string): string {
  const input = (rawModelId ?? '').trim();
  if (!input) {
    return 'openai/gpt-4o';
  }

  // Support UI lists that provide bare model ids (e.g. gpt-4o) by defaulting to OpenAI.
  if (!input.includes('/')) {
    return `openai/${input}`;
  }

  return input;
}

async function ensureMCPTools(forceRefresh = false): Promise<MCPToolSet | undefined> {
  if (!MCP_RUNTIME_ENABLED) {
    return undefined;
  }

  if (forceRefresh) {
    await resetMCPRuntime();
  }

  const configuredServers = await getConfiguredMcpServers(forceRefresh);
  const serverNames = new Set(configuredServers.map(([name]) => name));

  for (const [runtimeName, runtime] of mcpRuntime.servers.entries()) {
    if (serverNames.has(runtimeName)) {
      continue;
    }

    await closeServerRuntime(runtime);
    mcpRuntime.servers.delete(runtimeName);
  }

  if (configuredServers.length === 0) {
    mcpRuntime.lastError = 'No enabled MCP servers configured in mcp.config.json';
    return undefined;
  }

  const collectedTools: Array<[string, MCPToolSet]> = [];
  const errors: string[] = [];

  for (const [serverName, serverConfig] of configuredServers) {
    const serverTools = await ensureToolsForServer(serverName, serverConfig, forceRefresh);
    if (!serverTools || Object.keys(serverTools).length === 0) {
      const runtimeError = mcpRuntime.servers.get(serverName)?.lastError;
      errors.push(runtimeError ? `${serverName}: ${runtimeError}` : `${serverName}: no tools discovered`);
      continue;
    }

    collectedTools.push([serverName, serverTools]);
  }

  if (collectedTools.length === 0) {
    mcpRuntime.lastError = errors.join(' | ') || 'No MCP tools were discovered from enabled servers';
    return undefined;
  }

  const mergedTools = mergeServerTools(collectedTools);
  mcpRuntime.lastError = errors.length > 0 ? errors.join(' | ') : undefined;
  mcpRuntime.lastInitAt = Date.now();
  return mergedTools;
}

const mcpStatusCache: {
  value: MCPStatusResponse;
  timestamp: number;
  pending?: Promise<MCPStatusResponse>;
} = {
  value: {
    enabled: false,
    status: 'disabled',
    tools: [],
    reason: 'Status not checked yet',
  },
  timestamp: 0,
};

async function probeMCPStatus(forceRefresh = false): Promise<MCPStatusResponse> {
  const configPath = getAppConfigPath();
  if (!MCP_RUNTIME_ENABLED) {
    return {
      enabled: false,
      status: 'disabled',
      tools: [],
      reason: 'MCP_DOCKER_ENABLED is false',
      configPath,
      servers: [],
    };
  }

  try {
    const configuredServers = await getConfiguredMcpServers(forceRefresh);
    const tools = await ensureMCPTools(forceRefresh);
    if (!tools) {
      return {
        enabled: false,
        status: 'fallback',
        tools: [],
        reason: mcpRuntime.lastError ?? 'MCP client did not initialize from config',
        configPath,
        servers: configuredServers.map(([name]) => name),
      };
    }

    return {
      enabled: true,
      status: 'enabled',
      tools: Object.keys(tools),
      reason: mcpRuntime.lastError,
      configPath,
      servers: configuredServers.map(([name]) => name),
    };
  } catch (error) {
    return {
      enabled: false,
      status: 'fallback',
      tools: [],
      reason: error instanceof Error ? error.message : String(error),
      configPath,
      servers: [],
    };
  }
}

async function getCachedMCPStatus(forceRefresh = false): Promise<MCPStatusResponse> {
  const ageMs = Date.now() - mcpStatusCache.timestamp;
  if (!forceRefresh && mcpStatusCache.timestamp > 0 && ageMs < MCP_STATUS_CACHE_TTL_MS) {
    return mcpStatusCache.value;
  }

  if (!forceRefresh && mcpStatusCache.pending) {
    return mcpStatusCache.pending;
  }

  const pending = probeMCPStatus(forceRefresh)
    .then((status) => {
      mcpStatusCache.value = status;
      mcpStatusCache.timestamp = Date.now();
      return status;
    })
    .catch((error) => {
      const fallbackStatus: MCPStatusResponse = {
        enabled: false,
        status: 'fallback',
        tools: [],
        reason: error instanceof Error ? error.message : String(error),
      };
      mcpStatusCache.value = fallbackStatus;
      mcpStatusCache.timestamp = Date.now();
      return fallbackStatus;
    })
    .finally(() => {
      mcpStatusCache.pending = undefined;
    });

  mcpStatusCache.pending = pending;
  return pending;
}

// Enable CORS for local development
app.use('/*', cors());

// Chat endpoint with streaming
app.post('/api/chat', async (c) => {
  try {
    const body = await c.req.json();
    const {
      messages,
      model: requestedModelId = 'openai/gpt-4o',
      useMcp = true,
    }: { messages: UIMessage[], model?: string, useMcp?: boolean } = body;
    const modelId = normalizeModelId(requestedModelId);
    const mcpRequested = useMcp !== false;

    console.log('\n========== NEW CHAT REQUEST ==========');
    console.log('Received messages:', messages.length);
    console.log('Model:', modelId);
    console.log('Last message:', JSON.stringify(messages[messages.length - 1], null, 2));

    // Convert UI messages to model messages - this handles all part types including files automatically
    const modelMessages = await convertToModelMessages(messages);
    
    console.log('Converted to model messages:', JSON.stringify(modelMessages, null, 2));

    // Create UI message stream
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Start stream immediately so UI does not appear stuck while MCP initializes.
        writer.write({ type: 'start' });

        let mcpTools: MCPToolSet | undefined;
        let mcpStatus: 'enabled' | 'disabled' | 'fallback' = 'disabled';
        let mcpReason: string | undefined;

        if (MCP_RUNTIME_ENABLED && mcpRequested) {
          try {
            mcpTools = await ensureMCPTools();
            if (mcpTools && Object.keys(mcpTools).length > 0) {
              mcpStatus = 'enabled';
            } else {
              mcpStatus = 'fallback';
              mcpReason = mcpRuntime.lastError ?? 'MCP tools unavailable';
            }
          } catch (error) {
            mcpStatus = 'fallback';
            mcpReason = error instanceof Error ? error.message : String(error);
            console.warn('MCP Docker unavailable. Continuing without MCP tools:', mcpReason);
            mcpTools = undefined;
          }
        } else if (!mcpRequested) {
          mcpStatus = 'disabled';
          mcpReason = 'MCP disabled by user';
        }

        // Send custom metadata (optional)
        writer.write({
          type: 'data-custom',
          data: {
            model: modelId,
            timestamp: new Date().toISOString(),
            mcp: {
              requested: mcpRequested,
              enabled: mcpStatus === 'enabled',
              status: mcpStatus,
              reason: mcpReason,
            },
          },
        });

        // Stream response - AI Gateway automatically used when model is in 'provider/model-name' format
        const mcpToolsWithEvents = mcpTools ? wrapToolsWithProgressEvents(mcpTools, writer) : undefined;
        const streamTools = mcpToolsWithEvents as Parameters<typeof streamText>[0]['tools'];
        const latestUserText = getLatestUserText(messages);
        const heuristicIntent = isLikelySecurityToolIntent(latestUserText);
        const activeTools = mcpRequested ? selectActiveMCPTools(mcpToolsWithEvents, latestUserText) : undefined;
        const isLikelyToolIntent = Boolean(activeTools && activeTools.length > 0);
        const toolIntentRequested = mcpRequested && (heuristicIntent || isLikelyToolIntent);
        const shouldUseTools = mcpRequested && isLikelyToolIntent;

        const toolCount = mcpTools ? Object.keys(mcpTools).length : 0;
        console.log('MCP chat path:', {
          mcpStatus,
          toolCount,
          mcpRequested,
          toolIntentRequested,
          shouldUseTools,
          activeToolCount: activeTools?.length ?? 0,
          isLikelyToolIntent,
          modelId,
        });

        const result = streamText({
          model: modelId, // e.g., 'openai/gpt-4o', 'anthropic/claude-sonnet-4'
          messages: modelMessages,
          system: `You are VuleScan, a senior penetration testing assistant.

Mission and scope:
- Operate like a professional pentester focused on authorized security assessment and reconnaissance.
- Assume only defensive, lawful use inside approved scope.
- If scope is unclear, state assumptions briefly and continue with safest useful analysis.

MCP policy:
- MCP is optional and user-controlled.
- If MCP is enabled and tools are available, use relevant tools for recon/scan tasks.
- If MCP is disabled or unavailable, never claim a scan was executed. Clearly say tools were not run and provide manual commands/steps.

Tool execution policy:
- Use only relevant tools for the target and objective.
- Prefer minimal effective tool chains; avoid duplicate calls with the same arguments.
- Correlate outputs across tools and resolve contradictions before final conclusions.
- For subdomain enumeration, combine sources and deduplicate results.

Professional reporting format:
- Executive Summary: 2-4 lines with what was assessed and key risk signal.
- Scope and Method: target, assumptions, tools used (or not used).
- Findings: bullet list with evidence, risk level (Low/Medium/High/Critical), and impact.
- Validation Notes: confidence level, false-positive caveats, and data quality issues.
- Recommended Actions: prioritized remediation and next verification steps.

Reasoning and tone:
- Be precise, concise, and evidence-driven.
- Do not invent evidence.
- Distinguish clearly between observed facts, inferred hypotheses, and recommended next tests.
- End every response with a short "Next Step" line the user can execute immediately.`,
          temperature: 0.7,
          tools: shouldUseTools ? streamTools : undefined,
          activeTools: shouldUseTools ? activeTools : undefined,
          toolChoice: 'auto',
          stopWhen: stepCountIs(shouldUseTools ? 8 : 5),
          onFinish: async () => {
          },
        });

        // Merge AI stream into UI message stream
        writer.merge(
          result.toUIMessageStream({
            sendStart: false, // We already sent start event above
            onError: (error) => {
              // Expose error message to client for better debugging
              return error instanceof Error ? error.message : String(error);
            },
          }),
        );
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error('Chat API error:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// MCP status endpoint for UI diagnostics
app.get('/api/mcp/status', async (c) => {
  const refreshQuery = c.req.query('refresh');
  const shouldRefresh = refreshQuery === '1' || refreshQuery === 'true';
  const status = await getCachedMCPStatus(shouldRefresh);
  return c.json({
    ...status,
    timestamp: new Date().toISOString(),
    cacheTtlMs: MCP_STATUS_CACHE_TTL_MS,
  });
});

export default app;
