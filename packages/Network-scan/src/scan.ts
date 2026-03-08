import net from "net";
import dns from "dns/promises";
import http from "http";
import https from "https";
import { performance } from "perf_hooks";
import { readFileSync } from "fs";

/* =======================
   TYPES
======================= */

export type PortPreset =
  | "TOP_100"
  | "TOP_1000"
  | "WEB"
  | "DATABASE"
  | "MAIL"
  | "ALL";

export type ScanTechnique = "TCP_CONNECT" | "FAST_CONNECT" | "SERVICE_DETECT";

export interface ProxyConfig {
  host: string;
  port: number;
  type: "http" | "https" | "socks5";
  username?: string;
  password?: string;
}

export interface ProxyListConfig {
  proxies: ProxyConfig[];
  rotationStrategy: "round-robin" | "random" | "sequential";
}

export type ProxyOption = ProxyConfig | ProxyListConfig | "builtin" | undefined;

export interface ScanResult {
  success: boolean;
  target: string;
  ip: string | null;
  hostname: string | null;
  proxy?: ProxyConfig;
  scanInfo: {
    scanType: ScanTechnique;
    timeoutMs: number;
    portPreset: PortPreset | "CUSTOM";
    concurrency: number;
    startTime: string;
    endTime: string;
    durationMs: number;
    portsScanned: number;
    portsOpen: number;
    hostsScanned: number;
    hostsLive: number;
  };
  hostDiscovery?: {
    enabled: boolean;
    liveHosts: {
      host: string;
      ip: string;
      alive: boolean;
      responseTime?: number;
    }[];
  };
  networkMap?: {
    enabled: boolean;
    segments: {
      host: string;
      ip: string;
      openPorts: number[];
    }[];
  };
  firewallDetection?: {
    enabled: boolean;
    suspected: boolean;
    filteredPorts: number;
    filteredRatio: number;
    confidence: "LOW" | "MEDIUM" | "HIGH";
  };
  osFingerprint: {
    guess: string;
    confidence: "LOW" | "MEDIUM" | "HIGH";
    indicators: string[];
  };
  ports: {
    port: number;
    state: "OPEN" | "CLOSED" | "FILTERED";
    service: string | null;
    version?: string | null;
    banner: string | null;
    responseTime?: number;
  }[];
  scriptEngine?: {
    enabled: boolean;
    scripts: string[];
    findings: {
      host: string;
      port: number;
      script: string;
      output: string;
      severity: "INFO" | "LOW" | "MEDIUM" | "HIGH";
    }[];
  };
  vulnerabilities?: {
    port: number;
    service: string;
    issue: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }[];
  error?: string;
}

/* =======================
   PRESETS & SERVICES
======================= */

export const PRESETS: Record<PortPreset, number[]> = {
  TOP_100: [21, 22, 23, 25, 53, 80, 110, 139, 143, 443, 445, 3306, 3389, 8080],
  TOP_1000: Array.from({ length: 1000 }, (_, i) => i + 1),
  WEB: [80, 443, 8080, 8443],
  DATABASE: [1433, 1521, 3306, 5432, 6379, 27017],
  MAIL: [25, 110, 143, 465, 587, 993, 995],
  ALL: Array.from({ length: 65535 }, (_, i) => i + 1)
};

// Built-in proxy configuration
export const BUILTIN_PROXY: ProxyConfig = {
  host: "proxy.example.com",
  port: 8080,
  type: "http"
};

const SERVICES: Record<number, string> = {
  21: "FTP",
  22: "SSH",
  23: "TELNET",
  53: "DNS",
  25: "SMTP",
  110: "POP3",
  143: "IMAP",
  80: "HTTP",
  443: "HTTPS",
  445: "SMB",
  3306: "MYSQL",
  3389: "RDP",
  5432: "POSTGRESQL",
  8080: "HTTP-PROXY"
};

/* =======================
   PROXY UTILITIES
======================= */

let proxyRotationIndex = 0;

export function parseProxyListFile(filePath: string): ProxyConfig[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter(line => line.trim() && !line.startsWith("#"));
  
  return lines.map(line => {
    const trimmed = line.trim();
    try {
      const proxyUrl = new URL(trimmed.includes("://") ? trimmed : `http://${trimmed}`);
      return {
        host: proxyUrl.hostname || "",
        port: Number(proxyUrl.port) || (proxyUrl.protocol === "https:" ? 443 : 80),
        type: (proxyUrl.protocol?.replace(":", "") as "http" | "https" | "socks5") || "http",
        username: proxyUrl.username || undefined,
        password: proxyUrl.password || undefined
      };
    } catch (e) {
      throw new Error(`Invalid proxy format in file: ${trimmed}`);
    }
  });
}

export function getNextProxy(proxyOption: ProxyOption): ProxyConfig | undefined {
  if (!proxyOption) return undefined;
  if (proxyOption === "builtin") return BUILTIN_PROXY;
  
  if ("proxies" in proxyOption) {
    // Handle proxy list
    const list = proxyOption.proxies;
    if (list.length === 0) return undefined;
    
    if (proxyOption.rotationStrategy === "random") {
      return list[Math.floor(Math.random() * list.length)];
    } else {
      // round-robin or sequential
      const proxy = list[proxyRotationIndex % list.length];
      proxyRotationIndex++;
      return proxy;
    }
  }
  
  // Single proxy config
  return proxyOption;
}

/* =======================
   CORE SCAN LOGIC
======================= */

async function scanPort(
  host: string,
  port: number,
  timeoutMs: number,
  proxy?: ProxyConfig,
  scanType: ScanTechnique = "TCP_CONNECT",
  versionDetection: boolean = false
): Promise<ScanResult["ports"][0]> {
  return new Promise(resolve => {
    const socket = new net.Socket();
    const startTime = performance.now();
    let resolved = false;
    let connected = false;
    let banner = "";

    const effectiveTimeout =
      scanType === "FAST_CONNECT" ? Math.max(300, Math.floor(timeoutMs * 0.6)) : timeoutMs;

    const finish = (result: ScanResult["ports"][0]) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(effectiveTimeout);

    if (proxy && (proxy.type === "http" || proxy.type === "https")) {
      // Use HTTP CONNECT method for proxy tunneling
      const connectRequest = `CONNECT ${host}:${port} HTTP/1.1\r\nHost: ${host}:${port}\r\nConnection: close\r\n\r\n`;
      
      socket.connect(proxy.port, proxy.host, () => {
        socket.write(connectRequest);
      });

      socket.once("data", (data) => {
        const response = data.toString();
        if (response.includes("200")) {
          // Tunnel established, continue with normal protocol
          socket.write("\r\n");
        } else {
          socket.destroy();
          resolve({
            port,
            state: "CLOSED",
            service: null,
            banner: null
          });
        }
      });
    } else {
      socket.connect(port, host, () => {
        connected = true;
        socket.write("\r\n");

        setTimeout(() => {
          finish({
            port,
            state: "OPEN",
            service: SERVICES[port] ?? null,
            version: versionDetection ? detectVersion(SERVICES[port] ?? null, banner) : null,
            banner: null,
            responseTime: Math.round(performance.now() - startTime)
          });
        }, scanType === "SERVICE_DETECT" ? 260 : 140);
      });
    }

    socket.on("data", data => {
      const dataStr = data.toString();
      banner += dataStr;

      finish({
        port,
        state: "OPEN",
        service: SERVICES[port] ?? null,
        version: versionDetection ? detectVersion(SERVICES[port] ?? null, dataStr) : null,
        banner: dataStr.split("\n")[0]?.trim() ?? null,
        responseTime: Math.round(performance.now() - startTime)
      });
    });

    socket.on("timeout", () => {
      if (connected) {
        finish({
          port,
          state: "OPEN",
          service: SERVICES[port] ?? null,
            version: versionDetection ? detectVersion(SERVICES[port] ?? null, banner) : null,
          banner: null,
            responseTime: Math.round(performance.now() - startTime)
        });
      } else {
        finish({
          port,
          state: "FILTERED",
          service: SERVICES[port] ?? null,
          banner: null
        });
      }
    });

    socket.on("error", () => {
      finish({
        port,
        state: "CLOSED",
        service: null,
        banner: null
      });
    });
  });
}

async function scanPorts(
  host: string,
  ports: number[],
  timeoutMs: number,
  concurrency: number,
  proxyOption?: ProxyOption,
  scanType: ScanTechnique = "TCP_CONNECT",
  versionDetection: boolean = false
) {
  const results: ScanResult["ports"] = [];
  const queue = [...ports];

  async function worker() {
    while (queue.length) {
      const port = queue.shift();
      if (!port) return;
      const proxy = getNextProxy(proxyOption);
      const res = await scanPort(host, port, timeoutMs, proxy, scanType, versionDetection);
      results.push(res);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results.sort((a, b) => a.port - b.port);
}

function ipToInt(ip: string): number {
  return ip
    .split(".")
    .map(p => Number(p))
    .reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0;
}

function intToIp(n: number): string {
  return [24, 16, 8, 0].map(shift => (n >>> shift) & 255).join(".");
}

function expandCidr(cidr: string): string[] {
  const [baseIp, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  if (!baseIp || !Number.isInteger(bits) || bits < 16 || bits > 30) {
    throw new Error("Invalid CIDR range. Supported mask: /16 to /30");
  }

  const hostBits = 32 - bits;
  const count = Math.pow(2, hostBits);
  if (count > 1024) {
    throw new Error("CIDR range too large. Maximum 1024 hosts supported per scan");
  }

  const base = ipToInt(baseIp);
  const mask = (~0 << hostBits) >>> 0;
  const network = base & mask;

  const hosts: string[] = [];
  for (let i = 1; i < count - 1; i++) {
    hosts.push(intToIp(network + i));
  }
  return hosts;
}

async function discoverHost(host: string, timeoutMs: number): Promise<{ host: string; ip: string; alive: boolean; responseTime?: number }> {
  if (host === "127.0.0.1" || host === "localhost" || host === "::1") {
    return { host, ip: host === "localhost" ? "127.0.0.1" : host, alive: true, responseTime: 1 };
  }

  let ip = host;
  try {
    ip = (await dns.lookup(host)).address;
  } catch {
    return { host, ip: host, alive: false };
  }

  const probePorts = [80, 443, 22, 53];
  for (const port of probePorts) {
    const started = performance.now();
    const probe = await scanPort(ip, port, Math.max(500, Math.floor(timeoutMs * 0.5)));
    if (probe.state === "OPEN" || probe.state === "FILTERED" || probe.state === "CLOSED") {
      return {
        host,
        ip,
        alive: true,
        responseTime: Math.round(performance.now() - started)
      };
    }
  }

  return { host, ip, alive: false };
}

async function runHostDiscovery(targets: string[], timeoutMs: number, concurrency: number) {
  const queue = [...targets];
  const found: { host: string; ip: string; alive: boolean; responseTime?: number }[] = [];

  async function worker() {
    while (queue.length) {
      const host = queue.shift();
      if (!host) return;
      found.push(await discoverHost(host, timeoutMs));
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, 64)) }, worker));
  return found;
}

function detectVersion(service: string | null, banner: string): string | null {
  if (!banner) return null;

  const patterns: RegExp[] = [
    /OpenSSH[_\/-]([0-9.]+)/i,
    /Apache\/?([0-9.]+)/i,
    /nginx\/?([0-9.]+)/i,
    /Microsoft-IIS\/?([0-9.]+)/i,
    /Postfix\s*([0-9.]+)/i,
    /vsFTPd\s*([0-9.]+)/i,
    /MySQL\s*([0-9.]+)/i,
    /([0-9]+\.[0-9]+(?:\.[0-9]+)?)/
  ];

  for (const pattern of patterns) {
    const match = banner.match(pattern);
    if (match?.[1]) {
      return service ? `${service} ${match[1]}` : match[1];
    }
  }

  return null;
}

async function probeHttpServiceVersion(
  host: string,
  ip: string,
  port: number,
  timeoutMs: number
): Promise<string | null> {
  return new Promise(resolve => {
    const isTls = port === 443 || port === 8443;
    const lib = isTls ? https : http;

    const req = lib.request(
      {
        host: ip,
        port,
        method: "HEAD",
        path: "/",
        timeout: timeoutMs,
        headers: {
          Host: host,
          "User-Agent": "avs-network-scan/1.0"
        },
        rejectUnauthorized: false
      } as any,
      res => {
        const server = res.headers["server"]?.toString();
        if (server) {
          resolve(server);
        } else {
          resolve(isTls ? "HTTPS service detected" : "HTTP service detected");
        }
        res.resume();
      }
    );

    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.on("error", () => resolve(null));
    req.end();
  });
}

async function enrichServiceVersions(
  host: string,
  ip: string,
  ports: ScanResult["ports"],
  timeoutMs: number
): Promise<ScanResult["ports"]> {
  const updated = [...ports];

  for (let i = 0; i < updated.length; i++) {
    const item = updated[i];
    if (item.state !== "OPEN" || item.version) {
      continue;
    }

    if (item.port === 80 || item.port === 443 || item.port === 8080 || item.port === 8443) {
      const version = await probeHttpServiceVersion(host, ip, item.port, Math.max(timeoutMs, 1000));
      if (version) {
        updated[i] = {
          ...item,
          version
        };
      }
    }
  }

  return updated;
}

function detectOS(ports: ScanResult["ports"], enabled: boolean): ScanResult["osFingerprint"] {
  if (!enabled) {
    return { guess: "Unknown", confidence: "LOW", indicators: ["OS detection disabled"] };
  }

  const openPorts = ports.filter(p => p.state === "OPEN").map(p => p.port);
  const indicators: string[] = [];

  if (openPorts.includes(3389) || openPorts.includes(445)) {
    indicators.push("RDP/SMB ports exposed");
    return { guess: "Windows", confidence: "MEDIUM", indicators };
  }
  if (openPorts.includes(22) || openPorts.includes(111)) {
    indicators.push("SSH/RPC style services detected");
    return { guess: "Linux/Unix", confidence: "MEDIUM", indicators };
  }

  indicators.push("Insufficient distinguishing service fingerprints");
  return { guess: "Unknown", confidence: "LOW", indicators };
}

function detectFirewall(ports: ScanResult["ports"], enabled: boolean) {
  if (!enabled) {
    return {
      enabled: false,
      suspected: false,
      filteredPorts: 0,
      filteredRatio: 0,
      confidence: "LOW" as const
    };
  }

  const filtered = ports.filter(p => p.state === "FILTERED").length;
  const ratio = ports.length ? filtered / ports.length : 0;
  let confidence: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (ratio >= 0.6) confidence = "HIGH";
  else if (ratio >= 0.3) confidence = "MEDIUM";

  return {
    enabled: true,
    suspected: ratio >= 0.3,
    filteredPorts: filtered,
    filteredRatio: Number(ratio.toFixed(2)),
    confidence
  };
}

function runScripts(
  host: string,
  ports: ScanResult["ports"],
  scripts: string[]
): ScanResult["scriptEngine"] {
  const findings: NonNullable<ScanResult["scriptEngine"]>["findings"] = [];
  const normalized = scripts.length ? scripts : ["default"];

  for (const script of normalized) {
    for (const portInfo of ports.filter(p => p.state === "OPEN")) {
      if (script === "default" || script === "banner-check") {
        if (portInfo.banner && /OpenSSH_5|Apache\/2\.2|SSLv3|TLSv1(?!\.2|\.3)/i.test(portInfo.banner)) {
          findings.push({
            host,
            port: portInfo.port,
            script,
            output: `Potentially outdated banner detected: ${portInfo.banner}`,
            severity: "MEDIUM"
          });
        }
      }
      if ((script === "default" || script === "ftp-anon") && portInfo.port === 21) {
        findings.push({
          host,
          port: portInfo.port,
          script,
          output: "FTP exposed; verify anonymous login policy",
          severity: "LOW"
        });
      }
      if ((script === "default" || script === "web-title") && (portInfo.port === 80 || portInfo.port === 443 || portInfo.port === 8080)) {
        findings.push({
          host,
          port: portInfo.port,
          script,
          output: "Web service detected; run application-layer checks for deeper coverage",
          severity: "INFO"
        });
      }
    }
  }

  return {
    enabled: true,
    scripts: normalized,
    findings
  };
}

/* =======================
   PUBLIC API
======================= */

export async function scanNetwork(
  target: string,
  options?: {
    ports?: number[];
    preset?: PortPreset;
    timeoutMs?: number;
    concurrency?: number;
    checkVulns?: boolean;
    proxy?: ProxyOption;
    hostDiscovery?: boolean;
    versionDetection?: boolean;
    osDetection?: boolean;
    networkMapping?: boolean;
    firewallDetection?: boolean;
    scriptEngine?: boolean;
    scanType?: ScanTechnique;
    scripts?: string[];
  }
): Promise<ScanResult> {
  const start = Date.now();
  const timeoutMs = options?.timeoutMs ?? 2000;
  const concurrency = Math.min(options?.concurrency ?? 10, 100);
  const scanType = options?.scanType ?? "TCP_CONNECT";
  const versionDetection = options?.versionDetection ?? true;
  const hostDiscoveryEnabled = options?.hostDiscovery ?? true;
  const osDetectionEnabled = options?.osDetection ?? true;
  const networkMappingEnabled = options?.networkMapping ?? true;
  const firewallDetectionEnabled = options?.firewallDetection ?? true;
  const explicitScripts = options?.scripts ?? ["default"];
  const disabledByScriptValue = explicitScripts.some(script =>
    ["n", "no", "none", "off", "false"].includes(script.trim().toLowerCase())
  );
  const scriptEngineEnabled = (options?.scriptEngine ?? true) && !disabledByScriptValue;
  const scriptList = scriptEngineEnabled ? explicitScripts.filter(Boolean) : [];

  const rawTarget = target.trim();
  let host = rawTarget;
  let targets: string[];

  if (rawTarget.includes("/")) {
    targets = expandCidr(rawTarget);
    host = targets[0] || rawTarget;
  } else {
    try {
      const parsed = new URL(rawTarget.includes("://") ? rawTarget : `http://${rawTarget}`);
      host = parsed.hostname;
    } catch {
      host = rawTarget;
    }
    targets = [host];
  }

  const hostDiscovery = hostDiscoveryEnabled
    ? await runHostDiscovery(targets, timeoutMs, concurrency)
    : await Promise.all(
        targets.map(async h => {
          try {
            const result = await dns.lookup(h);
            return { host: h, ip: result.address, alive: true };
          } catch {
            return { host: h, ip: h, alive: false };
          }
        })
      );

  const liveHosts = hostDiscovery.filter(item => item.alive);
  const scanHosts = liveHosts.length ? liveHosts : hostDiscovery.slice(0, 1);

  const ports =
    options?.ports ??
    (options?.preset ? PRESETS[options.preset] : PRESETS.TOP_100);
  const allPortResults: { host: string; ip: string; ports: ScanResult["ports"] }[] = [];

  for (const targetHost of scanHosts) {
    let results = await scanPorts(
      targetHost.ip,
      ports,
      timeoutMs,
      concurrency,
      options?.proxy,
      scanType,
      versionDetection
    );

    if (versionDetection) {
      results = await enrichServiceVersions(targetHost.host, targetHost.ip, results, timeoutMs);
    }

    allPortResults.push({ host: targetHost.host, ip: targetHost.ip, ports: results });
  }

  const primary = allPortResults[0] ?? { host, ip: null as string | null, ports: [] as ScanResult["ports"] };
  const primaryPorts = primary.ports;

  // Determine proxy config for result
  let proxyInfo: ProxyConfig | undefined;
  if (options?.proxy === "builtin") {
    proxyInfo = BUILTIN_PROXY;
  } else if (options?.proxy && typeof options.proxy === "object" && "proxies" in options.proxy) {
    proxyInfo = {
      host: `${options.proxy.proxies.length} proxies (${options.proxy.rotationStrategy})`,
      port: 0,
      type: "http"
    } as any;
  } else if (options?.proxy && typeof options.proxy === "object") {
    proxyInfo = options.proxy as ProxyConfig;
  }

  const networkMap = {
    enabled: networkMappingEnabled,
    segments: allPortResults.map(item => ({
      host: item.host,
      ip: item.ip,
      openPorts: item.ports.filter(p => p.state === "OPEN").map(p => p.port)
    }))
  };

  const firewall = detectFirewall(primaryPorts, firewallDetectionEnabled);
  const osFingerprint = detectOS(primaryPorts, osDetectionEnabled);
  const scriptEngine = scriptEngineEnabled
    ? runScripts(primary.host, primaryPorts, scriptList)
    : {
        enabled: false,
        scripts: [],
        findings: []
      };

  return {
    success: true,
    target,
    ip: primary.ip,
    hostname: null,
    proxy: proxyInfo,
    scanInfo: {
      scanType,
      timeoutMs,
      portPreset: options?.ports ? "CUSTOM" : options?.preset ?? "TOP_100",
      concurrency,
      startTime: new Date(start).toISOString(),
      endTime: new Date().toISOString(),
      durationMs: Date.now() - start,
      portsScanned: ports.length,
      portsOpen: primaryPorts.filter(p => p.state === "OPEN").length,
      hostsScanned: targets.length,
      hostsLive: liveHosts.length
    },
    hostDiscovery: {
      enabled: hostDiscoveryEnabled,
      liveHosts: hostDiscovery
    },
    networkMap,
    firewallDetection: firewall,
    osFingerprint,
    ports: primaryPorts,
    scriptEngine
  };
}
