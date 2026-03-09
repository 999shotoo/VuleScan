import fs from "node:fs";
import path from "node:path";
import type { Agent } from "node:http";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import type {
  EngineRequestOptions,
  ProxyConfig,
  ProxyListConfig,
  ProxyMode,
  ProxyProtocol,
  ProxyRotateStrategy,
  ProxySingleConfig
} from "../types.js";

type ProxyEntry = {
  url: URL;
  protocol: ProxyProtocol;
};

type TargetProtocol = "http" | "https";

const SUPPORTED_PROXY_PROTOCOLS: Record<string, ProxyProtocol> = {
  "http:": "http",
  "https:": "https",
  "socks5:": "socks5"
};

export class ProxyManager {
  private readonly mode: ProxyMode;
  private readonly rotate: ProxyRotateStrategy;
  private readonly proxies: ProxyEntry[];
  private index: number;

  constructor(config?: ProxyConfig) {
    const normalized: ProxyConfig = config ?? { mode: "none" };

    this.mode = normalized.mode;
    this.rotate = "round-robin";
    this.proxies = [];
    this.index = 0;

    if (normalized.mode === "none") {
      return;
    }

    if (normalized.mode === "single") {
      this.proxies = [this.parseSingleConfig(normalized)];
      return;
    }

    if (normalized.mode === "list") {
      if (normalized.rotate && !isSupportedRotate(normalized.rotate)) {
        throw new Error(`Unsupported proxy rotation strategy: ${normalized.rotate}`);
      }
      this.rotate = normalized.rotate ?? "round-robin";
      this.proxies = this.loadProxyList(normalized);
      if (this.proxies.length === 0) {
        throw new Error("Proxy list is empty.");
      }
      return;
    }

    this.assertNever(normalized);
  }

  getAgentForRequest(requestUrl?: string | URL): Agent | undefined {
    if (this.mode === "none") {
      return undefined;
    }

    const entry = this.selectProxy();
    return this.createAgent(entry, requestUrl);
  }

  private parseSingleConfig(config: ProxySingleConfig): ProxyEntry {
    if ("url" in config) {
      return parseProxyUrl(config.url, "single proxy URL");
    }

    const protocol = config.protocol ?? "http";
    validateProxyProtocol(protocol, "single proxy protocol");

    const port = validatePort(config.port, "single proxy port");
    if (!config.host.trim()) {
      throw new Error("Proxy host is required for single proxy mode.");
    }

    if ((config.username && !config.password) || (!config.username && config.password)) {
      throw new Error("Proxy username and password must be provided together.");
    }

    const proxyUrl = new URL(`${protocol}://${config.host}:${port}`);
    if (config.username && config.password) {
      proxyUrl.username = config.username;
      proxyUrl.password = config.password;
    }

    return parseProxyUrl(proxyUrl.toString(), "single proxy config");
  }

  private loadProxyList(config: ProxyListConfig): ProxyEntry[] {
    const filePath = path.resolve(config.file);

    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to read proxy list file: ${message}`);
    }

    const entries: ProxyEntry[] = [];
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line) {
        continue;
      }
      const entry = parseProxyUrl(line, `proxy list line ${i + 1}`);
      entries.push(entry);
    }

    return entries;
  }

  private selectProxy(): ProxyEntry {
    if (this.proxies.length === 1) {
      return this.proxies[0];
    }

    if (this.rotate === "random") {
      const index = Math.floor(Math.random() * this.proxies.length);
      return this.proxies[index];
    }

    const entry = this.proxies[this.index % this.proxies.length];
    this.index = (this.index + 1) % this.proxies.length;
    return entry;
  }

  private createAgent(entry: ProxyEntry, requestUrl?: string | URL): Agent {
    const proxyUrl = entry.url.toString();

    if (entry.protocol === "socks5") {
      return new SocksProxyAgent(proxyUrl);
    }

    const targetProtocol = resolveTargetProtocol(requestUrl);
    if (targetProtocol === "http") {
      return new HttpProxyAgent(proxyUrl);
    }

    return new HttpsProxyAgent(proxyUrl);
  }

  private assertNever(value: never): never {
    throw new Error(`Unsupported proxy mode: ${String(value)}`);
  }
}

export function createProxyManager(config?: ProxyConfig): ProxyManager {
  return new ProxyManager(config);
}

export function buildRequestOptions(
  proxyManager: ProxyManager | undefined,
  requestUrl?: string | URL,
  baseOptions: EngineRequestOptions = {}
): EngineRequestOptions {
  const agent = proxyManager?.getAgentForRequest(requestUrl);
  if (!agent) {
    return baseOptions;
  }

  return {
    ...baseOptions,
    agent
  };
}

function parseProxyUrl(raw: string, source: string): ProxyEntry {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid proxy URL in ${source}: ${raw}`);
  }

  const protocol = SUPPORTED_PROXY_PROTOCOLS[url.protocol];
  if (!protocol) {
    throw new Error(`Unsupported proxy protocol in ${source}: ${url.protocol}`);
  }

  if (!url.hostname) {
    throw new Error(`Proxy host missing in ${source}.`);
  }

  if (!url.port) {
    throw new Error(`Proxy port missing in ${source}.`);
  }

  validatePort(url.port, source);

  return { url, protocol };
}

function validateProxyProtocol(protocol: ProxyProtocol, source: string): void {
  if (!SUPPORTED_PROXY_PROTOCOLS[`${protocol}:`]) {
    throw new Error(`Unsupported proxy protocol in ${source}: ${protocol}`);
  }
}

function validatePort(portValue: number | string, source: string): number {
  const port = typeof portValue === "string" ? Number(portValue) : portValue;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid proxy port in ${source}: ${portValue}`);
  }
  return port;
}

function resolveTargetProtocol(requestUrl?: string | URL): TargetProtocol {
  if (!requestUrl) {
    return "https";
  }

  try {
    const parsed = typeof requestUrl === "string" ? new URL(requestUrl) : requestUrl;
    return parsed.protocol === "http:" ? "http" : "https";
  } catch {
    return "https";
  }
}

function isSupportedRotate(value: string): value is ProxyRotateStrategy {
  return value === "round-robin" || value === "random";
}
