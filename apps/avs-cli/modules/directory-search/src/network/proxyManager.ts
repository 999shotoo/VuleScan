import fs from "fs/promises";
import { URL } from "url";
import type { Agent } from "http";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import { FileSystemError, InvalidInputError } from "../errors.js";

export type ProxyMode = "none" | "single" | "list";
export type ProxyRotate = "round-robin" | "random";

export type ProxyOptions = {
  mode?: ProxyMode;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  file?: string;
  rotate?: ProxyRotate;
};

type ProxyProtocol = "http" | "https" | "socks5";

type ProxyDefinition = {
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username?: string;
  password?: string;
};

const ALLOWED_PROTOCOLS: ProxyProtocol[] = ["http", "https", "socks5"];

export class ProxyManager {
  private readonly mode: ProxyMode;
  private readonly proxies: ProxyDefinition[];
  private readonly rotate: ProxyRotate;
  private readonly targetUrl: URL;
  private index = 0;
  private readonly agentCache = new Map<string, Agent>();

  private constructor(
    targetUrl: URL,
    mode: ProxyMode,
    proxies: ProxyDefinition[],
    rotate: ProxyRotate
  ) {
    this.targetUrl = targetUrl;
    this.mode = mode;
    this.proxies = proxies;
    this.rotate = rotate;
  }

  static async create(
    targetUrl: URL,
    options: ProxyOptions = {}
  ): Promise<ProxyManager | undefined> {
    const mode = options.mode ?? "none";
    if (!isProxyMode(mode)) {
      throw new InvalidInputError(
        "Invalid proxy mode. Use none, single, or list."
      );
    }

    if (mode === "none") return undefined;

    if (mode === "single") {
      const proxy = parseSingleProxy(options);
      return new ProxyManager(targetUrl, mode, [proxy], "round-robin");
    }

    const filePath = options.file?.trim();
    if (!filePath) {
      throw new InvalidInputError("Proxy file is required for list mode");
    }

    let content: string;
    try {
      content = await fs.readFile(filePath, "utf8");
    } catch (err) {
      throw new FileSystemError("Failed to read proxy list file", err);
    }

    const proxies = content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map((line, index) => parseProxyUrl(line, index + 1));

    if (proxies.length === 0) {
      throw new InvalidInputError("Proxy list file is empty");
    }

    const rotate = options.rotate ?? "round-robin";
    if (!isRotateMode(rotate)) {
      throw new InvalidInputError(
        "Invalid proxy rotation. Use round-robin or random."
      );
    }

    return new ProxyManager(targetUrl, mode, proxies, rotate);
  }

  getAgentForRequest(): Agent | undefined {
    if (this.mode === "none") return undefined;

    const proxy = this.pickProxy();
    if (!proxy) return undefined;

    const proxyUrl = buildProxyUrl(proxy);
    const cacheKey = `${proxyUrl}|${this.targetUrl.protocol}`;

    const cached = this.agentCache.get(cacheKey);
    if (cached) return cached;

    const agent = createAgent(proxy, this.targetUrl);
    this.agentCache.set(cacheKey, agent);
    return agent;
  }

  private pickProxy(): ProxyDefinition | undefined {
    if (this.proxies.length === 0) return undefined;

    if (this.mode === "single") return this.proxies[0];

    if (this.rotate === "random") {
      const index = Math.floor(Math.random() * this.proxies.length);
      return this.proxies[index];
    }

    const proxy = this.proxies[this.index % this.proxies.length];
    this.index = (this.index + 1) % this.proxies.length;
    return proxy;
  }
}

function isProxyMode(value: string): value is ProxyMode {
  return value === "none" || value === "single" || value === "list";
}

function isRotateMode(value: string): value is ProxyRotate {
  return value === "round-robin" || value === "random";
}

function parseSingleProxy(options: ProxyOptions): ProxyDefinition {
  const hostInput = options.host?.trim();
  if (!hostInput) {
    throw new InvalidInputError("Proxy host is required for single mode");
  }

  let protocol: ProxyProtocol = "http";
  let host = hostInput;
  let port = options.port;
  let username = options.username;
  let password = options.password;

  if (hostInput.includes("://")) {
    let url: URL;
    try {
      url = new URL(hostInput);
    } catch {
      throw new InvalidInputError("Invalid proxy host URL");
    }

    protocol = normalizeProtocol(url.protocol);
    host = url.hostname;

    if (!port && url.port) port = Number(url.port);
    if (username === undefined && url.username) {
      username = decodeURIComponent(url.username);
    }
    if (password === undefined && url.password) {
      password = decodeURIComponent(url.password);
    }
  }

  if (!port || !Number.isFinite(port)) {
    throw new InvalidInputError("Proxy port is required for single mode");
  }

  return { protocol, host, port, username, password };
}

function parseProxyUrl(line: string, lineNumber: number): ProxyDefinition {
  let url: URL;
  try {
    url = new URL(line);
  } catch {
    throw new InvalidInputError(
      `Invalid proxy entry at line ${lineNumber}: ${line}`
    );
  }

  const protocol = normalizeProtocol(url.protocol);
  const host = url.hostname;
  const port = Number(url.port);

  if (!host || !port || !Number.isFinite(port)) {
    throw new InvalidInputError(
      `Proxy entry missing host or port at line ${lineNumber}: ${line}`
    );
  }

  const username = url.username ? decodeURIComponent(url.username) : undefined;
  const password = url.password ? decodeURIComponent(url.password) : undefined;

  return { protocol, host, port, username, password };
}

function normalizeProtocol(protocol: string): ProxyProtocol {
  const normalized = protocol.replace(/:$/, "").toLowerCase();
  if (!ALLOWED_PROTOCOLS.includes(normalized as ProxyProtocol)) {
    throw new InvalidInputError(
      `Unsupported proxy protocol: ${protocol.replace(/:$/, "")}`
    );
  }
  return normalized as ProxyProtocol;
}

function buildProxyUrl(proxy: ProxyDefinition): string {
  const auth = proxy.username
    ? `${encodeURIComponent(proxy.username)}${
        proxy.password ? `:${encodeURIComponent(proxy.password)}` : ""
      }@`
    : "";

  return `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;
}

function createAgent(proxy: ProxyDefinition, targetUrl: URL): Agent {
  const proxyUrl = buildProxyUrl(proxy);

  if (proxy.protocol === "socks5") {
    return new SocksProxyAgent(proxyUrl);
  }

  if (proxy.protocol === "https") {
    return new HttpsProxyAgent(proxyUrl);
  }

  if (targetUrl.protocol === "https:") {
    return new HttpsProxyAgent(proxyUrl);
  }

  return new HttpProxyAgent(proxyUrl);
}
