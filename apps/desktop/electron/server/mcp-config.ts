import { promises as fs } from 'node:fs';
import path from 'node:path';

export type MCPServerConfig = {
  transport?: 'stdio' | 'url';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  enabled?: boolean;
};

export type AppPreferences = {
  coworkWebSearchEnabled: boolean;
  coworkScheduledTasksEnabled: boolean;
  sidebarMode: 'chat' | 'workspace';
};

export type AppConfig = {
  mcpServers: Record<string, MCPServerConfig>;
  preferences: AppPreferences;
};

const DEFAULT_CONFIG_FILE_NAME = 'mcp.config.json';

const DEFAULT_APP_CONFIG: AppConfig = {
  mcpServers: {
    pentestMCP: {
      transport: 'stdio',
      command: 'docker',
      args: ['run', '--rm', '-i', 'ramgameer/pentest-mcp:stdio-local'],
      enabled: true,
    },
  },
  preferences: {
    coworkWebSearchEnabled: true,
    coworkScheduledTasksEnabled: false,
    sidebarMode: 'chat',
  },
};

type ConfigCache = {
  path: string;
  mtimeMs: number;
  value: AppConfig;
};

let configCache: ConfigCache | undefined;

export function getAppConfigPath(): string {
  const explicitPath = process.env.VULESCAN_CONFIG_PATH?.trim();
  if (explicitPath) {
    return explicitPath;
  }

  const configDir = process.env.VULESCAN_CONFIG_DIR?.trim() || path.join(process.cwd(), 'config');
  return path.join(configDir, DEFAULT_CONFIG_FILE_NAME);
}

function normalizeConfig(raw: unknown): AppConfig {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Partial<AppConfig>;
  const rawServers = (input.mcpServers && typeof input.mcpServers === 'object'
    ? input.mcpServers
    : {}) as Record<string, MCPServerConfig>;

  const normalizedServers = Object.entries(rawServers).reduce<Record<string, MCPServerConfig>>((acc, [name, server]) => {
    const transport = server?.transport ?? (server?.url ? 'url' : 'stdio');

    acc[name] = {
      transport,
      command: typeof server?.command === 'string' ? server.command : undefined,
      args: Array.isArray(server?.args) ? server.args.filter((arg) => typeof arg === 'string') : [],
      env: server?.env && typeof server.env === 'object'
        ? Object.fromEntries(
            Object.entries(server.env)
              .filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string'),
          )
        : undefined,
      url: typeof server?.url === 'string' ? server.url : undefined,
      enabled: server?.enabled !== false,
    };

    return acc;
  }, {});

  const preferences = (
    input.preferences && typeof input.preferences === 'object'
      ? input.preferences
      : {}
  ) as Partial<AppPreferences>;

  return {
    mcpServers: Object.keys(normalizedServers).length > 0
      ? normalizedServers
      : DEFAULT_APP_CONFIG.mcpServers,
    preferences: {
      coworkWebSearchEnabled:
        typeof preferences.coworkWebSearchEnabled === 'boolean'
          ? preferences.coworkWebSearchEnabled
          : DEFAULT_APP_CONFIG.preferences.coworkWebSearchEnabled,
      coworkScheduledTasksEnabled:
        typeof preferences.coworkScheduledTasksEnabled === 'boolean'
          ? preferences.coworkScheduledTasksEnabled
          : DEFAULT_APP_CONFIG.preferences.coworkScheduledTasksEnabled,
      sidebarMode:
        preferences.sidebarMode === 'workspace'
          ? 'workspace'
          : DEFAULT_APP_CONFIG.preferences.sidebarMode,
    },
  };
}

export async function ensureAppConfigFile(): Promise<string> {
  const configPath = getAppConfigPath();
  await fs.mkdir(path.dirname(configPath), { recursive: true });

  try {
    await fs.access(configPath);
  } catch {
    await fs.writeFile(configPath, `${JSON.stringify(DEFAULT_APP_CONFIG, null, 2)}\n`, 'utf8');
  }

  return configPath;
}

export async function loadAppConfig(forceRefresh = false): Promise<AppConfig> {
  const configPath = await ensureAppConfigFile();

  const stat = await fs.stat(configPath);
  if (!forceRefresh && configCache && configCache.path === configPath && configCache.mtimeMs === stat.mtimeMs) {
    return configCache.value;
  }

  try {
    const content = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(content) as unknown;
    const normalized = normalizeConfig(parsed);

    configCache = {
      path: configPath,
      mtimeMs: stat.mtimeMs,
      value: normalized,
    };

    return normalized;
  } catch {
    configCache = {
      path: configPath,
      mtimeMs: stat.mtimeMs,
      value: DEFAULT_APP_CONFIG,
    };

    return DEFAULT_APP_CONFIG;
  }
}

export async function getConfiguredMcpServers(forceRefresh = false): Promise<Array<[string, MCPServerConfig]>> {
  const config = await loadAppConfig(forceRefresh);
  return Object.entries(config.mcpServers).filter(([, server]) => server?.enabled !== false);
}
