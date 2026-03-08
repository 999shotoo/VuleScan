import fs from "node:fs";
import path from "node:path";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import type { Agent } from "node:http";

export type ProxyMode = "none" | "single" | "list";
export type ProxyRotateStrategy = "round-robin" | "random";
export type ProxyProtocol = "http" | "https" | "socks5";

export interface ProxySingleInput {
  host: string;
  port?: number;
  username?: string;
  password?: string;
}

export interface ProxyListConfig {
  filePath: string;
  rotate?: ProxyRotateStrategy;
}

export interface ProxyManagerOptions {
  mode: ProxyMode;
  single?: ProxySingleInput;
  list?: ProxyListConfig;
}

export interface RequestOptions {
  agent?: Agent;
}

type ProxyEntry = {
  url: URL;
  protocol: ProxyProtocol;
  agent: Agent;
};

const SUPPORTED_PROTOCOLS: ProxyProtocol[] = ["http", "https", "socks5"];

export class ProxyManager {
  private mode: ProxyMode;
  private rotate: ProxyRotateStrategy;
  private entries: ProxyEntry[];
  private index: number;

  private constructor(
    mode: ProxyMode,
    entries: ProxyEntry[],
    rotate: ProxyRotateStrategy
  ) {
    this.mode = mode;
    this.entries = entries;
    this.rotate = rotate;
    this.index = 0;
  }

  static async create(options: ProxyManagerOptions): Promise<ProxyManager> {
    if (options.mode === "none") {
      return new ProxyManager("none", [], "round-robin");
    }

    if (options.mode === "single") {
      if (!options.single) {
        throw new Error("Proxy mode 'single' requires proxy settings.");
      }
      const entry = resolveSingleProxy(options.single);
      return new ProxyManager("single", [entry], "round-robin");
    }

    if (options.mode === "list") {
      if (!options.list?.filePath) {
        throw new Error("Proxy mode 'list' requires --proxy-file.");
      }
      const rotate = options.list.rotate ?? "round-robin";
      if (!isRotateStrategy(rotate)) {
        throw new Error("Proxy rotate strategy must be 'round-robin' or 'random'.");
      }
      const entries = await loadProxyList(options.list.filePath);
      if (entries.length === 0) {
        throw new Error("Proxy list file is empty.");
      }
      return new ProxyManager("list", entries, rotate);
    }

    throw new Error("Unsupported proxy mode.");
  }

  getAgentForRequest(): Agent | undefined {
    if (this.mode === "none" || this.entries.length === 0) {
      return undefined;
    }

    if (this.entries.length === 1) {
      return this.entries[0].agent;
    }

    if (this.rotate === "random") {
      const index = Math.floor(Math.random() * this.entries.length);
      return this.entries[index].agent;
    }

    const entry = this.entries[this.index];
    this.index = (this.index + 1) % this.entries.length;
    return entry.agent;
  }
}

function resolveSingleProxy(input: ProxySingleInput): ProxyEntry {
  const host = input.host.trim();
  if (!host) {
    throw new Error("--proxy-host is required for single proxy mode.");
  }

  if (host.includes("://")) {
    const url = parseProxyUrl(host, "--proxy-host");
    if (!url.port) {
      if (!input.port) {
        throw new Error("Proxy URL must include a port.");
      }
      url.port = String(input.port);
    }

    if (input.port && Number(url.port) !== input.port) {
      throw new Error("--proxy-port conflicts with the port in --proxy-host.");
    }

    const resolvedUsername = input.username ?? decodeURIComponent(url.username);
    const resolvedPassword = input.password ?? decodeURIComponent(url.password);

    if (input.username && url.username && resolvedUsername !== decodeURIComponent(url.username)) {
      throw new Error("--proxy-username conflicts with credentials in --proxy-host.");
    }

    if (input.password && url.password && resolvedPassword !== decodeURIComponent(url.password)) {
      throw new Error("--proxy-password conflicts with credentials in --proxy-host.");
    }

    url.username = resolvedUsername ?? "";
    url.password = resolvedPassword ?? "";

    return buildProxyEntry(url);
  }

  if (!input.port) {
    throw new Error(
      "--proxy-port is required when --proxy-host does not include a protocol."
    );
  }

  const url = buildProxyUrl({
    protocol: "http",
    host,
    port: input.port,
    username: input.username,
    password: input.password
  });

  return buildProxyEntry(url);
}

function loadProxyList(filePath: string): Promise<ProxyEntry[]> {
  const resolvedPath = path.resolve(filePath);
  return fs.promises
    .readFile(resolvedPath, "utf8")
    .then(content => {
      const lines = content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);

      return lines.map((line, index) => {
        const url = parseProxyUrl(line, `proxy list line ${index + 1}`);
        if (!url.port) {
          throw new Error(`Proxy list line ${index + 1} must include a port.`);
        }
        return buildProxyEntry(url);
      });
    })
    .catch(error => {
      if (error instanceof Error) {
        throw new Error(`Failed to read proxy list: ${error.message}`);
      }
      throw new Error("Failed to read proxy list.");
    });
}

function parseProxyUrl(value: string, context: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid proxy URL in ${context}.`);
  }

  const protocol = normalizeProtocol(url.protocol);
  if (!protocol) {
    throw new Error(
      `Unsupported proxy protocol in ${context}. Supported: ${SUPPORTED_PROTOCOLS.join(
        ", "
      )}.`
    );
  }

  if (!url.hostname) {
    throw new Error(`Proxy URL in ${context} must include a host.`);
  }

  return url;
}

function normalizeProtocol(protocol: string): ProxyProtocol | undefined {
  const normalized = protocol.replace(":", "");
  if (SUPPORTED_PROTOCOLS.includes(normalized as ProxyProtocol)) {
    return normalized as ProxyProtocol;
  }
  return undefined;
}

function isRotateStrategy(value: string): value is ProxyRotateStrategy {
  return value === "round-robin" || value === "random";
}

function buildProxyUrl(config: {
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username?: string;
  password?: string;
}): URL {
  const url = new URL(`${config.protocol}://${config.host}:${config.port}`);
  if (config.username) url.username = config.username;
  if (config.password) url.password = config.password;
  return url;
}

function buildProxyEntry(url: URL): ProxyEntry {
  const protocol = normalizeProtocol(url.protocol);
  if (!protocol) {
    throw new Error("Unsupported proxy protocol.");
  }

  const agent = createAgent(protocol, url);
  return { url, protocol, agent };
}

function createAgent(protocol: ProxyProtocol, url: URL): Agent {
  if (protocol === "http") {
    return new HttpProxyAgent(url);
  }

  if (protocol === "https") {
    return new HttpsProxyAgent(url);
  }

  return new SocksProxyAgent(url);
}
