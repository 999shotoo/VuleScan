import React from 'react'
import { useParams, useLocation } from 'react-router-dom'
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/src/components/ai-elements/attachments";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputBody,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/src/components/ai-elements/prompt-input";
import { PaperclipIcon, CopyIcon, RefreshCcwIcon, CheckCircle2Icon, AlertTriangleIcon, Loader2Icon, WrenchIcon } from "lucide-react";
import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useChat } from "@ai-sdk/react";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/src/components/ai-elements/model-selector";
import { Button } from "@/src/components/ui/button";
import { Switch } from "@/src/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/src/components/ui/popover";
import { getChatById, createNewChat, updateChatMessages } from '../../lib/chat-storage';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/src/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/src/components/ai-elements/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/src/components/ai-elements/tool";
import { Persona } from "@/src/components/ai-elements/persona";
import { Image as AIImage } from "@/src/components/ai-elements/image";
import { AITextRenderer } from "@/src/components/ai-elements/ai-text-renderer";
import { TaskItemFile } from "@/src/components/ai-elements/task";
import { WebPreview, WebPreviewBody, WebPreviewNavigation, WebPreviewUrl } from "@/src/components/ai-elements/web-preview";
import { DefaultChatTransport } from 'ai';
import { DropdownMenuTrigger } from "@/src/components/ui/dropdown-menu";

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) {
    return null;
  }
  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => (
        <Attachment
          data={attachment}
          key={attachment.id}
          onRemove={() => attachments.remove(attachment.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
};

type MCPStatus = {
  enabled: boolean;
  status: 'enabled' | 'disabled' | 'fallback';
  tools: string[];
  reason?: string;
  timestamp?: string;
};

type MCPToolEvent = {
  phase: 'tool-start' | 'tool-end' | 'tool-error';
  toolName: string;
  input?: unknown;
  startedAt?: number;
  finishedAt?: number;
  durationMs?: number;
  errorText?: string;
};

type ToolUsageState = 'running' | 'success' | 'error';

type ToolUsageSummary = {
  name: string;
  state: ToolUsageState;
  count: number;
  attempts: string[];
  durationMs?: number;
  errorText?: string;
};

type ToolExecutionRow = {
  id: string;
  toolName: string;
  state: 'input-available' | 'output-available' | 'output-error';
  input?: unknown;
  durationMs?: number;
  errorText?: string;
};

const extractMcpToolEvents = (dataItems: unknown): MCPToolEvent[] => {
  const events: MCPToolEvent[] = [];

  const maybePushEvent = (candidate: unknown) => {
    if (!candidate || typeof candidate !== 'object') {
      return;
    }

    const event = candidate as Partial<MCPToolEvent>;
    if (typeof event.toolName !== 'string' || typeof event.phase !== 'string') {
      return;
    }

    if (!['tool-start', 'tool-end', 'tool-error'].includes(event.phase)) {
      return;
    }

    events.push(event as MCPToolEvent);
  };

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }

    if (!value || typeof value !== 'object') {
      return;
    }

    const record = value as Record<string, unknown>;
    maybePushEvent(record.mcpEvent);
    maybePushEvent((record.data as any)?.mcpEvent);

    // Some transports batch custom payloads under nested arrays/objects.
    if (record.data && record.data !== value) {
      visit(record.data);
    }
  };

  visit(dataItems);
  return events;
};

const extractCurrentTurnMcpToolEvents = (chatMessages: any[], limit = 6): MCPToolEvent[] => {
  if (!Array.isArray(chatMessages) || limit <= 0) {
    return [];
  }

  const latestUserIndex = (() => {
    for (let i = chatMessages.length - 1; i >= 0; i -= 1) {
      if (chatMessages[i]?.role === 'user') {
        return i;
      }
    }

    return -1;
  })();

  if (latestUserIndex < 0) {
    return [];
  }

  const collected: MCPToolEvent[] = [];

  for (let messageIndex = chatMessages.length - 1; messageIndex > latestUserIndex && collected.length < limit; messageIndex -= 1) {
    const message = chatMessages[messageIndex];
    const parts = Array.isArray(message?.parts) ? message.parts : [];

    for (let partIndex = parts.length - 1; partIndex >= 0 && collected.length < limit; partIndex -= 1) {
      const part = parts[partIndex];
      if (typeof part?.type !== 'string' || !part.type.startsWith('data-')) {
        continue;
      }

      const extracted = extractMcpToolEvents(part.data ?? part);
      if (extracted.length > 0) {
        for (let eventIndex = extracted.length - 1; eventIndex >= 0 && collected.length < limit; eventIndex -= 1) {
          collected.push(extracted[eventIndex]);
        }
      }
    }
  }

  return collected.reverse();
};

const collapseToolEventsToLatestState = (events: MCPToolEvent[]): MCPToolEvent[] => {
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }

  const latestByTool = new Map<string, MCPToolEvent>();
  const order: string[] = [];

  for (const event of events) {
    if (!event?.toolName) {
      continue;
    }

    if (!latestByTool.has(event.toolName)) {
      order.push(event.toolName);
    }

    latestByTool.set(event.toolName, event);
  }

  return order
    .map((toolName) => latestByTool.get(toolName))
    .filter((event): event is MCPToolEvent => Boolean(event));
};

const extractToolUsageFromMessage = (message: any): ToolUsageSummary[] => {
  const parts: any[] = Array.isArray(message?.parts) ? message.parts : [];
  if (parts.length === 0) {
    return [];
  }

  const latestByTool = new Map<string, ToolUsageSummary>();
  const order: string[] = [];

  const toAttemptLabel = (input: unknown): string | undefined => {
    if (!input || typeof input !== 'object') {
      return undefined;
    }

    const record = input as Record<string, unknown>;
    const enumerate = typeof record.enumerate === 'string' ? record.enumerate.trim() : '';
    const target = typeof record.target === 'string' ? record.target.trim() : '';

    if (enumerate && target) {
      return `${enumerate} @ ${target}`;
    }

    if (enumerate) {
      return enumerate;
    }

    if (target) {
      return target;
    }

    return undefined;
  };

  const setToolUsage = (
    next: Omit<ToolUsageSummary, 'count' | 'attempts'>,
    options?: { increment?: boolean; attempt?: string },
  ) => {
    if (!next.name) {
      return;
    }

    const existing = latestByTool.get(next.name);
    const shouldIncrement = Boolean(options?.increment);
    const attempt = options?.attempt?.trim();

    if (!existing) {
      order.push(next.name);
      latestByTool.set(next.name, {
        ...next,
        count: shouldIncrement ? 1 : 1,
        attempts: attempt ? [attempt] : [],
      });
      return;
    }

    const mergedAttempts = attempt
      ? Array.from(new Set([...existing.attempts, attempt]))
      : existing.attempts;

    latestByTool.set(next.name, {
      ...existing,
      ...next,
      count: shouldIncrement ? existing.count + 1 : existing.count,
      attempts: mergedAttempts,
    });
  };

  for (const part of parts) {
    if (!part || typeof part !== 'object') {
      continue;
    }

    if (part.type === 'tool-call') {
      const name = String(part.toolName ?? '').trim();
      if (name) {
        setToolUsage(
          { name, state: 'running' },
          { increment: true, attempt: toAttemptLabel(part.args) },
        );
      }
      continue;
    }

    if (part.type === 'tool-result') {
      const name = String(part.toolName ?? '').trim();
      if (name) {
        setToolUsage({ name, state: 'success' });
      }
      continue;
    }

    if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
      const name = String(part.type).replace(/^tool-/, '').trim();
      const toolState = String(part.state ?? 'input-streaming');
      const state: ToolUsageState =
        toolState === 'output-error'
          ? 'error'
          : toolState === 'output-available'
            ? 'success'
            : 'running';

      if (name) {
        setToolUsage({
          name,
          state,
          errorText: typeof part.errorText === 'string' ? part.errorText : undefined,
        }, { attempt: toAttemptLabel((part as any).input ?? (part as any).args) });
      }
      continue;
    }

    if (typeof part.type === 'string' && part.type.startsWith('data-')) {
      const events = extractMcpToolEvents([part.data ?? part]);
      for (const event of events) {
        const state: ToolUsageState =
          event.phase === 'tool-error'
            ? 'error'
            : event.phase === 'tool-end'
              ? 'success'
              : 'running';

        setToolUsage({
          name: event.toolName,
          state,
          durationMs: event.durationMs,
          errorText: event.errorText,
        }, {
          increment: event.phase === 'tool-start',
          attempt: toAttemptLabel(event.input),
        });
      }
    }
  }

  return order
    .map((name) => latestByTool.get(name))
    .filter((tool): tool is ToolUsageSummary => Boolean(tool));
};

const extractToolExecutionRowsFromMessage = (message: any, limit = 10): ToolExecutionRow[] => {
  const parts: any[] = Array.isArray(message?.parts) ? message.parts : [];
  if (parts.length === 0 || limit <= 0) {
    return [];
  }

  const rows: ToolExecutionRow[] = [];
  const pendingByTool = new Map<string, ToolExecutionRow[]>();
  let sequence = 0;

  const nextId = (toolName: string) => `${toolName}-${sequence++}`;

  const pushPending = (toolName: string, row: ToolExecutionRow) => {
    const queue = pendingByTool.get(toolName) ?? [];
    queue.push(row);
    pendingByTool.set(toolName, queue);
  };

  const shiftPending = (toolName: string): ToolExecutionRow | undefined => {
    const queue = pendingByTool.get(toolName);
    if (!queue || queue.length === 0) {
      return undefined;
    }

    const row = queue.shift();
    if (queue.length === 0) {
      pendingByTool.delete(toolName);
    } else {
      pendingByTool.set(toolName, queue);
    }

    return row;
  };

  for (const part of parts) {
    if (!part || typeof part !== 'object') {
      continue;
    }

    if (typeof part.type !== 'string' || !part.type.startsWith('data-')) {
      continue;
    }

    const events = extractMcpToolEvents(part.data ?? part);
    for (const event of events) {
      if (event.phase === 'tool-start') {
        const row: ToolExecutionRow = {
          id: nextId(event.toolName),
          toolName: event.toolName,
          state: 'input-available',
          input: event.input ?? { status: 'running' },
        };
        rows.push(row);
        pushPending(event.toolName, row);
        continue;
      }

      const pending = shiftPending(event.toolName);
      if (pending) {
        pending.state = event.phase === 'tool-end' ? 'output-available' : 'output-error';
        pending.durationMs = event.durationMs;
        pending.errorText = event.errorText;
      } else {
        rows.push({
          id: nextId(event.toolName),
          toolName: event.toolName,
          state: event.phase === 'tool-end' ? 'output-available' : 'output-error',
          input: event.input ?? {},
          durationMs: event.durationMs,
          errorText: event.errorText,
        });
      }
    }
  }

  return rows.slice(-limit);
};

// ModelItem component for rendering each model
interface ModelItemProps {
  model: typeof models[0];
  onSelect: (id: string) => void;
}

const ModelItem = memo(({ model, onSelect }: ModelItemProps) => {
  const handleSelect = useCallback(
    () => onSelect(model.id),
    [onSelect, model.id]
  );
  return (
    <ModelSelectorItem
      key={model.id}
      onSelect={handleSelect}
      value={model.id}
      className="my-1 rounded-md data-selected:bg-accent/70 data-selected:text-accent-foreground"
    >
      <ModelSelectorLogo provider={model.chefSlug} />
      <ModelSelectorName>{model.name}</ModelSelectorName>
    </ModelSelectorItem>
  );
});

ModelItem.displayName = "ModelItem";

const extractLatestHtmlPreview = (chatMessages: any[]): string | null => {
  const htmlRegex = /```html(?:\s+[^\n]+)?\n([\s\S]*?)```/;

  for (let i = chatMessages.length - 1; i >= 0; i -= 1) {
    const message = chatMessages[i];
    if (message?.role !== 'assistant' || !Array.isArray(message?.parts)) {
      continue;
    }

    for (const part of message.parts) {
      if (part?.type !== 'text' || typeof part?.text !== 'string') {
        continue;
      }

      const match = part.text.match(htmlRegex);
      if (match) {
        return match[1];
      }
    }
  }

  return null;
};

const hasTextPart = (parts: any[] | undefined): boolean => {
  if (!Array.isArray(parts)) {
    return false;
  }

  return parts.some(
    (part: any) => part?.type === "text" && typeof part?.text === "string" && part.text.trim().length > 0,
  );
};

const hasRenderableAssistantPart = (parts: any[] | undefined): boolean => {
  if (!Array.isArray(parts)) {
    return false;
  }

  return parts.some((part: any) => {
    const type = part?.type;
    if (type === "text") {
      return typeof part?.text === "string" && part.text.trim().length > 0;
    }

    if (type === "image" || type === "file" || type === "tool-call" || type === "tool-result") {
      return true;
    }

    return typeof type === "string" && type.startsWith("tool-");
  });
};

const models = [
  { id: "openai/gpt-4o", name: "GPT-4o", chef: "OpenAI", chefSlug: "openai", providers: ["openai"] },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", chef: "OpenAI", chefSlug: "openai", providers: ["openai"] },
  { id: "openai/gpt-5", name: "GPT-5", chef: "OpenAI", chefSlug: "openai", providers: ["openai"] },
  { id: "openai/gpt-5.2", name: "GPT-5.2", chef: "OpenAI", chefSlug: "openai", providers: ["openai"] },
  { id: "openai/o3", name: "O3", chef: "OpenAI", chefSlug: "openai", providers: ["openai"] },
  { id: "openai/o3-mini", name: "O3 Mini", chef: "OpenAI", chefSlug: "openai", providers: ["openai"] },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", chef: "Anthropic", chefSlug: "anthropic", providers: ["anthropic"] },
  { id: "anthropic/claude-opus-4.6", name: "Claude Opus 4.6", chef: "Anthropic", chefSlug: "anthropic", providers: ["anthropic"] },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", chef: "Anthropic", chefSlug: "anthropic", providers: ["anthropic"] },
  { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", chef: "Anthropic", chefSlug: "anthropic", providers: ["anthropic"] },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", chef: "Google", chefSlug: "google", providers: ["google"] },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", chef: "Google", chefSlug: "google", providers: ["google"] },
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", chef: "Google", chefSlug: "google", providers: ["google"] },
  { id: "google/gemini-3-flash", name: "Gemini 3 Flash", chef: "Google", chefSlug: "google", providers: ["google"] },
  { id: "deepseek/deepseek-v3", name: "DeepSeek v3", chef: "DeepSeek", chefSlug: "deepseek", providers: ["deepseek"] },
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek v3.2", chef: "DeepSeek", chefSlug: "deepseek", providers: ["deepseek"] },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", chef: "DeepSeek", chefSlug: "deepseek", providers: ["deepseek"] },
  { id: "xai/grok-4", name: "Grok 4", chef: "xAI", chefSlug: "xai", providers: ["xai"] },
  { id: "xai/grok-3", name: "Grok 3", chef: "xAI", chefSlug: "xai", providers: ["xai"] },
  { id: "meta/llama-3.3-70b", name: "Llama 3.3 70B", chef: "Meta", chefSlug: "llama", providers: ["meta"] },
  { id: "meta/llama-3.1-70b", name: "Llama 3.1 70B", chef: "Meta", chefSlug: "llama", providers: ["meta"] },
  { id: "mistral/mistral-large-3", name: "Mistral Large 3", chef: "Mistral AI", chefSlug: "mistral", providers: ["mistral"] },
  { id: "mistral/mistral-medium", name: "Mistral Medium", chef: "Mistral AI", chefSlug: "mistral", providers: ["mistral"] },
  { id: "alibaba/qwen3-max", name: "Qwen3 Max", chef: "Alibaba", chefSlug: "alibaba", providers: ["alibaba"] },
  { id: "alibaba/qwen3-coder", name: "Qwen3 Coder", chef: "Alibaba", chefSlug: "alibaba", providers: ["alibaba"] },
  { id: "perplexity/sonar-pro", name: "Sonar Pro", chef: "Perplexity", chefSlug: "perplexity", providers: ["perplexity"] },
  { id: "perplexity/sonar", name: "Sonar", chef: "Perplexity", chefSlug: "perplexity", providers: ["perplexity"] },
  { id: "kwaipilot/kat-coder-pro-v1", name: "Kat Coder Pro v1", chef: "Kwaipilot", chefSlug: "kwaipilot", providers: ["kwaipilot"] },
];

export const MainChat = () => {
  const params = useParams()
  const location = useLocation()
  const fallbackSessionIdRef = useRef(Date.now().toString());
  const sessionId = params.id ?? fallbackSessionIdRef.current;
  const [text, setText] = useState<string>("");
  const [model, setModel] = useState<string>(models[0].id);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const initialMessageSentForSession = useRef<Set<string>>(new Set());
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSwitchingChat, setIsSwitchingChat] = useState(false);
  const [mcpStatus, setMcpStatus] = useState<MCPStatus | null>(null);
  const [isMcpLoading, setIsMcpLoading] = useState(false);
  const [mcpEnabled, setMcpEnabled] = useState(true);
  const mcpToggleTouchedRef = useRef(false);
  const submitLockRef = useRef(false);
  
  const { messages, sendMessage, status, setMessages, error, regenerate, stop } = useChat({
    id: sessionId,
    transport: new DefaultChatTransport({
      api: "http://localhost:3000/api/chat",
    }),
  });

  // Load chat from localStorage on mount
  useEffect(() => {
    setIsSwitchingChat(true);
    setMessages([]);
    setInitialMessageSent(false);
    
    let existingChat = getChatById(sessionId);

    if (!existingChat) {
      // Create new chat if it doesn't exist
      existingChat = createNewChat(sessionId);
    }

    if (existingChat.messages.length > 0) {
      setMessages(existingChat.messages);
      setInitialMessageSent(true);
      const savedPreviewHtml = extractLatestHtmlPreview(existingChat.messages as any[]);
      setPreviewHtml(savedPreviewHtml);
      setShowPreview(Boolean(savedPreviewHtml));
    } else {
      setMessages([]);
      setPreviewHtml(null);
      setShowPreview(false);
    }

    const animationFrame = window.requestAnimationFrame(() => {
      setIsSwitchingChat(false);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [sessionId]);

  // Handle initial message from navigation state
  useEffect(() => {
    const initialMessage = (location.state as any)?.initialMessage;
    if (
      initialMessage &&
      !initialMessageSent &&
      messages.length === 0 &&
      !initialMessageSentForSession.current.has(sessionId)
    ) {
      // Guard against duplicate sends caused by Strict Mode effect re-runs.
      initialMessageSentForSession.current.add(sessionId);
      sendMessage(
        { text: initialMessage, files: [] },
        { body: { model: model, useMcp: mcpEnabled } }
      );
      setInitialMessageSent(true);
    }
  }, [location.state, initialMessageSent, messages.length, sessionId, model, mcpEnabled, sendMessage]);

  // Save messages to localStorage whenever they change so the first turn appears immediately.
  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      updateChatMessages(sessionId, messages);
    }, 120);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [messages, sessionId]);

  const handleSubmit = useCallback(async (message: PromptInputMessage) => {
    if (status !== "ready" || submitLockRef.current) {
      return;
    }

    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments)) {
      return;
    }

    submitLockRef.current = true;

    sendMessage(
      {
        text: message.text || "Please analyze these attachments",
        files: message.files,
      },
      {
        body: {
          model: model,
          useMcp: mcpEnabled,
        },
      }
    );
    setText("");
  }, [sendMessage, model, mcpEnabled, status]);

  useEffect(() => {
    const stored = localStorage.getItem('chat.mcp.enabled');
    if (stored === 'true' || stored === 'false') {
      setMcpEnabled(stored === 'true');
    }
  }, []);

  useEffect(() => {
    // Auto-recover from stale persisted OFF state when MCP backend is healthy,
    // unless user explicitly toggled MCP in this app session.
    if (!mcpToggleTouchedRef.current && mcpStatus?.status === 'enabled' && !mcpEnabled) {
      setMcpEnabled(true);
    }
  }, [mcpStatus?.status, mcpEnabled]);

  useEffect(() => {
    localStorage.setItem('chat.mcp.enabled', String(mcpEnabled));
  }, [mcpEnabled]);

  useEffect(() => {
    if (status === "ready" || status === "error") {
      submitLockRef.current = false;
    }
  }, [status]);

  const handleModelSelect = useCallback((id: string) => {
    setModel(id);
    setModelSelectorOpen(false);
  }, []);

  const handleMcpToggle = useCallback((checked: boolean) => {
    mcpToggleTouchedRef.current = true;
    setMcpEnabled(Boolean(checked));
  }, []);

  const refreshMcpStatus = useCallback(async () => {
    setIsMcpLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/mcp/status');
      if (!response.ok) {
        throw new Error(`MCP status request failed with ${response.status}`);
      }

      const data = await response.json() as MCPStatus;
      setMcpStatus(data);
    } catch (statusError) {
      setMcpStatus({
        enabled: false,
        status: 'fallback',
        tools: [],
        reason: statusError instanceof Error
          ? statusError.message
          : 'Failed to fetch MCP status',
      });
    } finally {
      setIsMcpLoading(false);
    }
  }, []);

  const forceRefreshMcpStatus = useCallback(async () => {
    setIsMcpLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/mcp/status?refresh=1');
      if (!response.ok) {
        throw new Error(`MCP status refresh failed with ${response.status}`);
      }

      const data = await response.json() as MCPStatus;
      setMcpStatus(data);
    } catch (statusError) {
      setMcpStatus({
        enabled: false,
        status: 'fallback',
        tools: [],
        reason: statusError instanceof Error
          ? statusError.message
          : 'Failed to refresh MCP status',
      });
    } finally {
      setIsMcpLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMcpStatus();
  }, [refreshMcpStatus]);

  const selectedModelData = models.find((m) => m.id === model);
  const chefs = [...new Set(models.map((m) => m.chef))];

  const isStreaming = status === "streaming" || status === "submitted";
  const lastMessage = messages[messages.length - 1] as any;
  const latestAssistantHasText =
    lastMessage?.role === "assistant" && hasTextPart(lastMessage?.parts);
  const displayMessages = messages.filter((message, index) => {
    const isLatestMessage = index === messages.length - 1;
    const isLatestStreamingAssistantWithoutRenderableParts =
      message.role === "assistant" &&
      isLatestMessage &&
      isStreaming &&
      !hasRenderableAssistantPart((message as any)?.parts);

    return !isLatestStreamingAssistantWithoutRenderableParts;
  });
  const lastVisibleMessage = displayMessages[displayMessages.length - 1];
  const showThinkingIndicator =
    isStreaming &&
    (!lastVisibleMessage || lastVisibleMessage.role === "user");
  const activeToolStates = ((isStreaming && lastMessage?.role === 'assistant') ? (lastMessage as any)?.parts : [])
    .filter((part: any) => typeof part?.type === 'string' && part.type.startsWith('tool-'))
    .map((part: any) => ({
      name: String(part.type).replace(/^tool-/, ''),
      state: String(part.state ?? 'pending'),
    }));

  const recentMcpToolEvents = collapseToolEventsToLatestState(
    extractCurrentTurnMcpToolEvents(messages as any[], 12),
  ).slice(-6);
  const fallbackLoadingTools = (() => {
    const primaryToolState = activeToolStates.find(
      (tool) => !['output-available', 'output-error'].includes(tool.state),
    );

    if (primaryToolState) {
      return [primaryToolState];
    }

    return [];
  })();

  const isMcpOnline = mcpEnabled && mcpStatus?.status === 'enabled';
  const hasStreamingToolSignals =
    activeToolStates.length > 0 ||
    recentMcpToolEvents.length > 0;
  const showToolLoadingFallback =
    mcpEnabled &&
    isStreaming &&
    hasStreamingToolSignals &&
    !latestAssistantHasText;
  const showAssistantProgressIndicator = isStreaming && (showThinkingIndicator || showToolLoadingFallback);

  // Handler to open preview with specific HTML
  const handleOpenPreview = useCallback((html: string) => {
    setPreviewHtml(html);
    setShowPreview(true);
  }, []);

  // Keep preview URL stable until preview HTML actually changes to avoid iframe flicker.
  useEffect(() => {
    if (!previewHtml) {
      setPreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(new Blob([previewHtml], { type: 'text/html' }));
    setPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [previewHtml]);

  const hasPreview = showPreview && Boolean(previewHtml) && Boolean(previewUrl);

  return (
    <div className="h-full flex flex-row" style={{ overflow: 'hidden', width: '100%' }}>
      {/* LEFT SIDE: Chat */}
      <div
        className="flex flex-col transition-[width] duration-300 ease-out"
        style={{
          overflow: 'hidden',
          minWidth: 0,
          width: hasPreview ? '56%' : '100%',
        }}
      >
        <div
          className={`flex-1 flex flex-col transition-opacity duration-200 ${isSwitchingChat ? 'opacity-0' : 'opacity-100'}`}
          style={{ overflow: 'hidden', minWidth: 0 }}
        >
          <Conversation className="overflow-hidden">
            <ConversationContent className="px-6 py-4 mx-auto max-w-3xl xl:max-w-7xl ">
            {displayMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <h2 className="text-2xl font-semibold">Welcome to VuleScan AI Chat</h2>
                <p className="text-muted-foreground max-w-md">
                  Start a conversation with AI. You can upload images and choose from 100+ AI models.
                </p>
              </div>
            )}
            {displayMessages.map((message, msgIndex) => (
              <div key={`${message.id}-${msgIndex}`} className="mb-4" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                <Message from={message.role}>
                  {(() => {
                    const messageToolUsage = message.role === 'assistant'
                      ? extractToolUsageFromMessage(message as any)
                      : [];
                    const toolExecutionRows = message.role === 'assistant'
                      ? extractToolExecutionRowsFromMessage(message as any, 12)
                      : [];

                    return (
                  <div className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`} style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                    {/* Avatar */}
                    <div className="shrink-0">
                      {message.role === "assistant" ? (
                        <Persona
                          variant="obsidian"
                          state="idle"
                          className="size-8"
                        />
                      ) : (
                        <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                          U
                        </div>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0 overflow-hidden box-border max-w-full">
                      <MessageContent className="break-words overflow-hidden box-border max-w-full text-[15px] leading-7">
                        {message.parts.map((part, i) => {
                          switch (part.type) {
                            case "text":
                              return (
                                <AITextRenderer
                                  key={`${message.id}-part-${i}`}
                                  text={part.text}
                                  onPreview={handleOpenPreview}
                                  messageId={message.id}
                                  partIndex={i}
                                />
                              );
                            case "image":
                              // Check if it's a base64 data URL or regular URL
                              const imageUrl = part.image;
                              if (imageUrl.startsWith('data:')) {
                                // Extract base64 and media type from data URL
                                const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
                                if (matches) {
                                  return (
                                    <AIImage
                                      key={`${message.id}-part-${i}`}
                                      base64={matches[2]}
                                      mediaType={matches[1] as any}
                                      alt="Uploaded image"
                                      className="max-w-full w-auto h-auto"
                                    />
                                  );
                                }
                              }
                              // Fallback to regular img tag for non-data URLs
                              return (
                                <div key={`${message.id}-part-${i}`} className="my-2 max-w-full overflow-hidden">
                                  <img
                                    src={imageUrl}
                                    alt="Image"
                                    className="max-w-full w-auto h-auto rounded-lg border"
                                  />
                                </div>
                              );
                            case "file":
                              // Handle file attachments - images and other files
                              if (part.mediaType?.startsWith('image/')) {
                                return (
                                  <div key={`${message.id}-part-${i}`} className="my-2 max-w-full overflow-hidden">
                                    <img
                                      src={part.url}
                                      alt={part.filename || 'Uploaded image'}
                                      className="max-w-full w-auto h-auto rounded-lg border"
                                    />
                                  </div>
                                );
                              }
                              return (
                                <div key={`${message.id}-part-${i}`} className="my-2">
                                  <TaskItemFile>
                                    <PaperclipIcon className="h-3 w-3" />
                                    <span>{part.filename || 'File attachment'}</span>
                                  </TaskItemFile>
                                </div>
                              );
                            case "tool-call":
                              const toolCallPart = part as any;
                              const toolCallName = toolCallPart.toolName ?? 'tool-call';
                              return (
                                <Tool defaultOpen={false} key={`${message.id}-part-${i}`}>
                                  <ToolHeader
                                    type={`tool-${toolCallName}` as any}
                                    state={"input-available" as any}
                                    title={toolCallName}
                                  />
                                  <ToolContent>
                                    <ToolInput input={toolCallPart.args ?? {}} />
                                  </ToolContent>
                                </Tool>
                              );
                            case "tool-result":
                              const toolResultPart = part as any;
                              return (
                                <Tool defaultOpen={false} key={`${message.id}-part-${i}`}>
                                  <ToolHeader
                                    type={`tool-${toolResultPart.toolName ?? 'result'}` as any}
                                    state={"output-available" as any}
                                    title={toolResultPart.toolName ?? 'Tool Result'}
                                  />
                                  <ToolContent>
                                    <ToolOutput
                                      output={toolResultPart.result}
                                      errorText={undefined as any}
                                    />
                                  </ToolContent>
                                </Tool>
                              );
                            default:
                              if (typeof (part as any)?.type === 'string' && (part as any).type.startsWith('tool-')) {
                                const toolPart = part as any;
                                const toolName = toolPart.type.replace(/^tool-/, '');
                                const toolState = toolPart.state ?? 'input-streaming';
                                const payload =
                                  toolPart.output ??
                                  toolPart.result ??
                                  toolPart.input ??
                                  toolPart.args ??
                                  null;

                                return (
                                  <Tool defaultOpen={false} key={`${message.id}-part-${i}`}>
                                    <ToolHeader
                                      type={toolPart.type as any}
                                      state={toolState as any}
                                      title={toolName}
                                    />
                                    <ToolContent>
                                      <ToolInput input={toolPart.input ?? toolPart.args ?? {}} />
                                      <ToolOutput
                                        output={toolPart.output ?? toolPart.result ?? payload}
                                        errorText={toolPart.errorText}
                                      />
                                    </ToolContent>
                                  </Tool>
                                );
                              }
                              return null;
                          }
                        })}
                      </MessageContent>

                      {/* Message Actions - only show for completed assistant messages */}
                      {message.role === "assistant" &&
                        message.parts.length > 0 &&
                        !(isStreaming && msgIndex === displayMessages.length - 1) && (
                          <MessageActions className="mt-2">
                            <MessageAction
                              label="Copy"
                              onClick={async () => {
                                const textContent = message.parts
                                  .filter((p) => p.type === "text")
                                  .map((p) => (p as any).text)
                                  .join("\n");
                                if (textContent) {
                                  try {
                                    await navigator.clipboard.writeText(textContent);
                                  } catch (err) {
                                    console.error('Failed to copy:', err);
                                  }
                                }
                              }}
                              tooltip="Copy to clipboard"
                              size="icon-sm"
                            >
                              <CopyIcon className="size-4" />
                            </MessageAction>
                            <MessageAction
                              label="Regenerate"
                              onClick={async () => {
                                try {
                                  await regenerate({
                                    messageId: message.id,
                                    body: { model, useMcp: mcpEnabled }
                                  });
                                } catch (err) {
                                  console.error('Failed to regenerate:', err);
                                }
                              }}
                              tooltip="Regenerate response"
                              size="icon-sm"
                            >
                              <RefreshCcwIcon className="size-4" />
                            </MessageAction>
                          </MessageActions>
                        )}

                      {/* Persist tool usage after generation so users can see which tools were used. */}
                      {message.role === "assistant" && toolExecutionRows.length > 0 && (
                        <div className="mt-2 space-y-2">
                          <div className="text-xs text-muted-foreground">Tool execution:</div>
                          {toolExecutionRows.map((row) => (
                            <Tool defaultOpen={false} key={`${message.id}-tool-exec-${row.id}`}>
                              <ToolHeader
                                type={`tool-${row.toolName}` as any}
                                state={row.state as any}
                                title={row.toolName}
                              />
                              <ToolContent>
                                <ToolInput input={row.input ?? {}} />
                                <ToolOutput
                                  output={row.state === 'output-available' ? { durationMs: row.durationMs } : undefined}
                                  errorText={row.state === 'output-error' ? row.errorText : undefined}
                                />
                              </ToolContent>
                            </Tool>
                          ))}
                        </div>
                      )}

                      {/* Compact summary chips for quick glance. */}
                      {message.role === "assistant" && messageToolUsage.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Tools used:</span>
                          {messageToolUsage.map((tool) => {
                            const badgeClassName =
                              tool.state === 'success'
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : tool.state === 'error'
                                  ? 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'
                                  : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300';

                            const suffix =
                              typeof tool.durationMs === 'number' && tool.durationMs >= 0
                                ? ` (${tool.durationMs}ms)`
                                : '';
                            const countLabel = tool.count > 1 ? ` x${tool.count}` : '';
                            const attemptsLabel =
                              tool.attempts.length > 0
                                ? ` [${tool.attempts.join(' | ')}]`
                                : '';

                            return (
                              <span
                                key={`${message.id}-tool-used-${tool.name}`}
                                className={`inline-flex items-center rounded-md border px-2 py-1 ${badgeClassName}`}
                                title={tool.errorText || undefined}
                              >
                                {tool.name}{countLabel}{attemptsLabel}{suffix}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                    );
                  })()}
                </Message>
              </div>
            ))}

            {/* Thinking indicator - show when AI is processing and no response yet */}
            {showAssistantProgressIndicator && (
                <Message from="assistant">
                  <div className="flex gap-3 w-full">
                    <div className="shrink-0">
                      <Persona
                        variant="obsidian"
                        state="thinking"
                        className="size-8"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <MessageContent>
                        {showToolLoadingFallback ? (
                          <div className="space-y-2">
                            {recentMcpToolEvents.length > 0
                              ? recentMcpToolEvents.map((event, index) => {
                                  const mappedState =
                                    event.phase === 'tool-start'
                                      ? 'input-available'
                                      : event.phase === 'tool-end'
                                        ? 'output-available'
                                        : 'output-error';

                                  return (
                                    <Tool defaultOpen={false} key={`tool-event-${event.toolName}-${index}`}>
                                      <ToolHeader
                                        type={`tool-${event.toolName}` as any}
                                        state={mappedState as any}
                                        title={event.toolName}
                                      />
                                      <ToolContent>
                                        <ToolInput input={event.input ?? { status: 'running' }} />
                                        <ToolOutput
                                          output={event.phase === 'tool-end' ? { durationMs: event.durationMs } : undefined}
                                          errorText={event.phase === 'tool-error' ? event.errorText : undefined}
                                        />
                                      </ToolContent>
                                    </Tool>
                                  );
                                })
                              : fallbackLoadingTools.map((tool, index) => (
                              <Tool defaultOpen={false} key={`tool-loading-${tool.name}-${index}`}>
                                <ToolHeader
                                  type={`tool-${tool.name}` as any}
                                  state={(tool.state as any) || 'input-streaming'}
                                  title={tool.name}
                                />
                                <ToolContent>
                                  <ToolInput input={{
                                    status: tool.state?.replaceAll('-', ' ') ?? 'pending',
                                  }} />
                                  <ToolOutput output={undefined as any} errorText={undefined as any} />
                                </ToolContent>
                              </Tool>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="flex gap-1">
                              <span className="inline-block animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                              <span className="inline-block animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                              <span className="inline-block animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
                            </div>
                            <span className="text-sm">Thinking...</span>
                          </div>
                        )}
                      </MessageContent>
                    </div>
                  </div>
                </Message>
              )}

            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
                <strong className="font-semibold">Error:</strong>
                <p className="text-sm mt-1">{error.message}</p>
                <button
                  onClick={async () => {
                    try {
                      await regenerate({ body: { model, useMcp: mcpEnabled } });
                    } catch (err) {
                      console.error('Failed to retry:', err);
                    }
                  }}
                  className="mt-2 text-sm underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        
        <div className="shrink-0 border-t px-4 pt-4 pb-4 bg-background">
          <div className="max-w-3xl xl:max-w-7xl mx-auto w-full">
            <PromptInput
            onSubmit={handleSubmit}
            globalDrop
            multiple
            accept="image/*,application/pdf,.txt,.doc,.docx"
            maxFileSize={10 * 1024 * 1024} // 10MB
            onError={(error) => {
              console.error('File upload error:', error);
            }}
          >
            <PromptInputHeader>
              <PromptInputAttachmentsDisplay />
            </PromptInputHeader>
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(e) => setText(e.target.value)}
                value={text}
                placeholder="What would you like to know? (Supports images, PDFs, and text files)"
                disabled={isStreaming}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                {!isStreaming ? (
                  <>
                    <PromptInputActionMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button aria-label="Add attachments" size="icon-sm" variant="ghost">
                            <PaperclipIcon className="size-4" />
                          </Button>
                        }
                      />
                      <PromptInputActionMenuContent>
                        <PromptInputActionAddAttachments />
                      </PromptInputActionMenuContent>
                    </PromptInputActionMenu>

                    <ModelSelector onOpenChange={setModelSelectorOpen} open={modelSelectorOpen}>
                      <ModelSelectorTrigger
                        render={<Button className="h-9 min-w-[180px] justify-start gap-2" variant="outline" size="sm" />}
                      >
                        {selectedModelData?.chefSlug && (
                          <ModelSelectorLogo provider={selectedModelData.chefSlug} />
                        )}
                        {selectedModelData?.name && (
                          <ModelSelectorName className="text-xs">{selectedModelData.name}</ModelSelectorName>
                        )}
                      </ModelSelectorTrigger>
                      <ModelSelectorContent className="w-[380px] max-w-[calc(100vw-2rem)] border border-border/80 bg-popover/95 shadow-2xl backdrop-blur-sm">
                        <ModelSelectorInput placeholder="Search models..." />
                        <ModelSelectorList>
                          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                          {chefs.map((chef) => (
                            <ModelSelectorGroup heading={chef} key={chef}>
                              {models
                                .filter((m) => m.chef === chef)
                                .map((m) => (
                                  <ModelItem
                                    key={m.id}
                                    model={m}
                                    onSelect={handleModelSelect}
                                  />
                                ))}
                            </ModelSelectorGroup>
                          ))}
                        </ModelSelectorList>
                      </ModelSelectorContent>
                    </ModelSelector>

                    <Popover>
                      <PopoverTrigger
                        render={<Button variant="outline" size="sm" className="h-9 min-w-[120px] justify-between gap-2" />}
                      >
                        <span className="inline-flex items-center gap-2 text-xs">
                          <span className={`inline-block h-2 w-2 rounded-full ${mcpEnabled ? (isMcpOnline ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-zinc-500'}`} />
                          {mcpEnabled ? 'MCP On' : 'MCP Off'}
                        </span>
                        {isMcpLoading ? (
                          <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                        ) : isMcpOnline ? (
                          <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <AlertTriangleIcon className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </PopoverTrigger>

                      <PopoverContent align="start" className="w-96 max-w-[calc(100vw-2rem)]">
                        <PopoverHeader>
                          <PopoverTitle className="flex items-center gap-2 text-sm">
                            <WrenchIcon className="h-4 w-4" />
                            MCP Docker Status
                          </PopoverTitle>
                          <PopoverDescription>
                            {!mcpEnabled
                              ? 'MCP is disabled for this chat.'
                              : isMcpOnline
                                ? 'Connected and tools are available.'
                                : 'Running with fallback (no MCP tools).'}
                          </PopoverDescription>
                        </PopoverHeader>

                        <div className="flex items-center justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
                          <span className="text-muted-foreground">Enable MCP tools for this chat</span>
                          <Switch
                            checked={mcpEnabled}
                            onCheckedChange={(checked) => handleMcpToggle(Boolean(checked))}
                            size="sm"
                          />
                        </div>

                        <div className="rounded-md border border-border/70 bg-muted/20 p-2 text-xs">
                          <div>Status: <strong>{mcpStatus?.status ?? 'unknown'}</strong></div>
                          {mcpStatus?.reason && (
                            <div className="mt-1 break-words text-muted-foreground">Reason: {mcpStatus.reason}</div>
                          )}
                          {mcpStatus?.timestamp && (
                            <div className="mt-1 text-muted-foreground">Checked: {new Date(mcpStatus.timestamp).toLocaleTimeString()}</div>
                          )}
                        </div>

                        <div className="mt-1">
                          <div className="mb-1 text-xs font-medium">Available Tools ({mcpStatus?.tools?.length ?? 0})</div>
                          {mcpStatus?.tools?.length ? (
                            <div className="max-h-48 overflow-auto rounded-md border border-border/70 bg-background p-1">
                              {mcpStatus.tools.map((toolName) => (
                                <div key={toolName} className="rounded-sm px-2 py-1 text-xs hover:bg-muted/40">
                                  {toolName}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-md border border-dashed border-border/70 p-2 text-xs text-muted-foreground">
                              No MCP tools discovered.
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end">
                          <Button size="sm" variant="secondary" onClick={() => void forceRefreshMcpStatus()} disabled={isMcpLoading}>
                            {isMcpLoading ? 'Checking...' : 'Refresh'}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="destructive" size="sm" onClick={() => stop()}>
                      Stop
                    </Button>

                    <Popover>
                      <PopoverTrigger
                        render={<Button variant="outline" size="sm" className="h-9 min-w-[120px] justify-between gap-2" />}
                      >
                        <span className="inline-flex items-center gap-2 text-xs">
                          <span className={`inline-block h-2 w-2 rounded-full ${mcpEnabled ? (isMcpOnline ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-zinc-500'}`} />
                          {mcpEnabled ? 'MCP On' : 'MCP Off'}
                        </span>
                        {isMcpLoading ? (
                          <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                        ) : isMcpOnline ? (
                          <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <AlertTriangleIcon className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </PopoverTrigger>

                      <PopoverContent align="start" className="w-96 max-w-[calc(100vw-2rem)]">
                        <PopoverHeader>
                          <PopoverTitle className="flex items-center gap-2 text-sm">
                            <WrenchIcon className="h-4 w-4" />
                            MCP Docker Status
                          </PopoverTitle>
                          <PopoverDescription>
                            {!mcpEnabled
                              ? 'MCP is disabled for this chat.'
                              : isMcpOnline
                                ? 'Connected and tools are available.'
                                : 'Running with fallback (no MCP tools).'}
                          </PopoverDescription>
                        </PopoverHeader>

                        <div className="flex items-center justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
                          <span className="text-muted-foreground">Enable MCP tools for this chat</span>
                          <Switch
                            checked={mcpEnabled}
                            onCheckedChange={(checked) => handleMcpToggle(Boolean(checked))}
                            size="sm"
                          />
                        </div>

                        <div className="rounded-md border border-border/70 bg-muted/20 p-2 text-xs">
                          <div>Status: <strong>{mcpStatus?.status ?? 'unknown'}</strong></div>
                          {mcpStatus?.reason && (
                            <div className="mt-1 break-words text-muted-foreground">Reason: {mcpStatus.reason}</div>
                          )}
                          {mcpStatus?.timestamp && (
                            <div className="mt-1 text-muted-foreground">Checked: {new Date(mcpStatus.timestamp).toLocaleTimeString()}</div>
                          )}
                        </div>

                        <div className="mt-1">
                          <div className="mb-1 text-xs font-medium">Available Tools ({mcpStatus?.tools?.length ?? 0})</div>
                          {mcpStatus?.tools?.length ? (
                            <div className="max-h-48 overflow-auto rounded-md border border-border/70 bg-background p-1">
                              {mcpStatus.tools.map((toolName) => (
                                <div key={toolName} className="rounded-sm px-2 py-1 text-xs hover:bg-muted/40">
                                  {toolName}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-md border border-dashed border-border/70 p-2 text-xs text-muted-foreground">
                              No MCP tools discovered.
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end">
                          <Button size="sm" variant="secondary" onClick={() => void forceRefreshMcpStatus()} disabled={isMcpLoading}>
                            {isMcpLoading ? 'Checking...' : 'Refresh'}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </PromptInputTools>
              <div className="ml-2">
                {!isStreaming ? (
                  <PromptInputSubmit disabled={isStreaming} status={status} />
                ) : (
                  <PromptInputSubmit disabled />
                )}
              </div>
            </PromptInputFooter>
          </PromptInput>
          </div>
        </div>
        </div>
      </div>
      
      {/* RIGHT SIDE: Preview Panel */}
      <div
        className="flex flex-col h-full transition-[width,opacity] duration-300 ease-out"
        style={{
          overflow: 'hidden',
          minWidth: 0,
          width: hasPreview ? '44%' : '0%',
          opacity: hasPreview ? 1 : 0,
          borderLeftWidth: hasPreview ? 1 : 0,
          borderLeftStyle: 'solid',
        }}
      >
        {previewUrl && (
          <WebPreview defaultUrl={previewUrl} className="h-full w-full rounded-none border-0 overflow-hidden">
            <WebPreviewNavigation className="bg-muted border-b border-border">
              <WebPreviewUrl className="bg-background" />
            </WebPreviewNavigation>
            <WebPreviewBody 
              src={previewUrl} 
              className="flex-1 bg-white dark:bg-white" 
            />
          </WebPreview>
        )}
      </div>
    </div>
  )
}
