#!/usr/bin/env node
import dns from "dns/promises";
import dnsSync from "dns";
import http from "http";
import https from "https";
import { performance } from "perf_hooks";
import * as dgram from "dgram";
import * as net from "net";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";

type Confidence = "LOW" | "MEDIUM" | "HIGH";
type DNSRecordType = "A" | "AAAA" | "MX" | "NS" | "TXT" | "SRV" | "CNAME" | "SOA";
const DEFAULT_QUERY_TYPES: DNSRecordType[] = ["A", "AAAA", "MX", "NS", "TXT", "SRV", "CNAME"];

export interface DNSRecord {
  type: DNSRecordType;
  value: any;
  ttl?: number;
}

export interface SubdomainResult {
  subdomain: string;
  resolved: boolean;
  ip?: string;
  ips?: string[];
  dnsTTL?: number;
  dnsRecords?: DNSRecord[];
  discoveryMethod?: string;
  http?: {
    status: number;
    https: boolean;
    server: string | null;
    responseTime: number;
  } | null;
  cdn?: {
    detected: boolean;
    provider?: string;
  };
  confidence: Confidence;
}

export interface Output {
  success: boolean;
  target: string;
  scanInfo: {
    techniques: string[];
    queryTypes?: DNSRecordType[];
    timeoutMs: number;
    concurrency: number;
    nameservers?: string[];
    proxies?: string[];
    startTime: string;
    endTime: string;
    durationMs: number;
    recordsEnumerated: number;
    subdomainsFound: number;
  };
  wildcardDNS: {
    enabled: boolean;
    testSubdomain: string;
  };
  zoneTransfer?: {
    checked: boolean;
    successfulNameservers: string[];
  };
  reverseLookup?: {
    checked: boolean;
    records: string[];
  };
  subdomains: SubdomainResult[];
  dnsServers?: {
    primary?: string[];
    secondary?: string[];
  };
  securityFindings?: {
    subdomain: string;
    issue: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
  }[];
}

function detectCDN(server: string | null): { detected: boolean; provider?: string } {
  if (!server) return { detected: false };
  const s = server.toLowerCase();
  if (s.includes("cloudflare")) return { detected: true, provider: "Cloudflare" };
  if (s.includes("akamai")) return { detected: true, provider: "Akamai" };
  if (s.includes("fastly")) return { detected: true, provider: "Fastly" };
  return { detected: false };
}

// Get nameservers for domain
export async function getNameservers(domain: string): Promise<string[]> {
  try {
    const ns = await dns.resolveNs(domain);
    return ns || [];
  } catch {
    return [];
  }
}

// Extract subdomains from DNS records
function extractSubdomainsFromRecords(domain: string, records: any[], recordType: string): string[] {
  const subdomains = new Set<string>();

  records.forEach(record => {
    if (recordType === "MX" && record.exchange) {
      const parts = record.exchange.split(".");
      if (parts.length > 1) {
        subdomains.add(record.exchange.replace(/\.$/, ""));
      }
    } else if (recordType === "NS" && record) {
      const ns = record.replace(/\.$/, "");
      subdomains.add(ns);
    } else if (recordType === "CNAME" && record) {
      const cname = record.replace(/\.$/, "");
      subdomains.add(cname);
    } else if (recordType === "SRV" && record.name) {
      const srv = record.name.replace(/\.$/, "");
      subdomains.add(srv);
    } else if (recordType === "TXT" && Array.isArray(record)) {
      const txtData = record.join("");
      // Extract potential subdomains from TXT records (especially DKIM, SPF)
      const matches = txtData.match(/([a-zA-Z0-9-_]+\.[a-zA-Z0-9.-]+)/g) || [];
      matches.forEach(m => {
        if (m.includes(domain) || m.includes("mail") || m.includes("dkim")) {
          subdomains.add(m);
        }
      });
    }
  });

  return Array.from(subdomains).filter(s => s && s !== domain && s.includes("."));
}

// Get all DNS records for domain
export async function getDNSRecords(domain: string, queryTypes: DNSRecordType[] = DEFAULT_QUERY_TYPES): Promise<Map<string, any[]>> {
  const records = new Map<string, any[]>();
  for (const type of queryTypes) {
    try {
      if (type === "SRV") {
        const result = await dns.resolveSrv(`_http._tcp.${domain}`).catch(() => null);
        if (result && result.length > 0) {
          records.set("SRV", result);
        }
      } else if (type === "SOA") {
        const result = await dns.resolveSoa(domain);
        records.set("SOA", [result]);
      } else {
        const method = `resolve${type}` as keyof typeof dns;
        const data = await (dns as any)[method](domain);
        if (data && data.length > 0) {
          records.set(type, data);
        }
      }
    } catch {
      // Record type not found, continue
    }
  }

  return records;
}

// Enumerate subdomains from DNS records
export async function enumerateFromDNS(
  domain: string,
  queryTypes: DNSRecordType[] = DEFAULT_QUERY_TYPES
): Promise<Map<string, SubdomainResult>> {
  const subdomains = new Map<string, SubdomainResult>();
  const records = await getDNSRecords(domain, queryTypes);

  for (const [recordType, recordData] of records) {
    const extractedSubs = extractSubdomainsFromRecords(domain, recordData, recordType);
    
    for (const sub of extractedSubs) {
      if (!subdomains.has(sub)) {
        subdomains.set(sub, {
          subdomain: sub,
          resolved: true,
          discoveryMethod: `DNS_${recordType}`,
          confidence: "HIGH"
        });
      }
    }
  }

  return subdomains;
}

// Reverse DNS enumeration
export async function reverseEnumeration(domain: string): Promise<string[]> {
  try {
    const ns = await getNameservers(domain);
    const subdomains = new Set<string>();

    for (const nameserver of ns) {
      subdomains.add(nameserver);
    }

    return Array.from(subdomains);
  } catch {
    return [];
  }
}

// Attempt zone transfer
export async function attemptZoneTransfer(nameserver: string, domain: string, timeoutMs: number = 5000): Promise<string[]> {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: nameserver, port: 53 });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve([]);
    }, timeoutMs);

    let resolved = false;
    const finish = (records: string[]) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(records);
    };

    socket.on("connect", () => {
      try {
        const query = buildDNSQuery(domain, "AXFR");
        const packet = Buffer.alloc(query.length + 2);
        packet.writeUInt16BE(query.length, 0);
        query.copy(packet, 2);
        socket.write(packet);
      } catch {
        finish([]);
      }
    });

    socket.on("data", data => {
      try {
        if (data.length < 14) {
          finish([]);
          return;
        }

        const dnsStart = 2; // skip TCP message length
        const flags = data.readUInt16BE(dnsStart + 2);
        const rcode = flags & 0x000f;
        const answerCount = data.readUInt16BE(dnsStart + 6);

        if (rcode === 0 && answerCount > 0) {
          finish([`${domain} (AXFR response records=${answerCount})`]);
        } else {
          finish([]);
        }
      } catch {
        finish([]);
      }
    });

    socket.on("error", () => finish([]));
    socket.on("end", () => finish([]));
  });
}

// Build basic DNS query packet
function buildDNSQuery(domain: string, queryType: string): Buffer {
  const buffer = Buffer.alloc(512);
  let offset = 0;

  // DNS Header
  offset += 2; // Transaction ID
  buffer.writeUInt16BE(0x0000, 0);
  offset = 2;
  buffer.writeUInt16BE(0x0000, offset); // Flags
  offset += 2;
  buffer.writeUInt16BE(0x0001, offset); // Questions
  offset += 2;
  buffer.writeUInt16BE(0x0000, offset); // Answer RRs
  offset += 2;
  buffer.writeUInt16BE(0x0000, offset); // Authority RRs
  offset += 2;
  buffer.writeUInt16BE(0x0000, offset); // Additional RRs
  offset += 2;

  // Question section - encode domain name
  const parts = domain.split(".");
  for (const part of parts) {
    buffer.writeUInt8(part.length, offset++);
    offset += buffer.write(part, offset);
  }
  buffer.writeUInt8(0, offset++); // Root label

  const queryTypeMap: Record<string, number> = {
    A: 0x0001,
    NS: 0x0002,
    CNAME: 0x0005,
    SOA: 0x0006,
    MX: 0x000f,
    TXT: 0x0010,
    AAAA: 0x001c,
    SRV: 0x0021,
    AXFR: 0x00fc
  };

  buffer.writeUInt16BE(queryTypeMap[queryType] ?? 0x0001, offset);
  offset += 2;

  // Query class (1 = IN)
  buffer.writeUInt16BE(0x0001, offset);
  offset += 2;

  return buffer.slice(0, offset);
}

async function reverseLookupFromIps(ips: string[]): Promise<string[]> {
  const reverseRecords = new Set<string>();

  for (const ip of ips) {
    try {
      const names = await dns.reverse(ip);
      for (const name of names) {
        reverseRecords.add(name);
      }
    } catch {
      // Ignore failed reverse lookup per IP
    }
  }

  return Array.from(reverseRecords).sort();
}

export function probeHTTP(host: string, httpsMode: boolean, timeoutMs: number, proxyUrl?: string): Promise<SubdomainResult["http"]> {
  return new Promise(resolve => {
    const lib = httpsMode ? https : http;
    const start = performance.now();

    const options: any = {
      host,
      path: "/",
      timeout: timeoutMs,
      rejectUnauthorized: false
    };

    if (proxyUrl) {
      options.agent = httpsMode ? new HttpsProxyAgent(proxyUrl) : new HttpProxyAgent(proxyUrl);
    }

    const req = lib.get(
      options,
      res => {
        const rt = Math.round(performance.now() - start);
        resolve({
          status: res.statusCode || 0,
          https: httpsMode,
          server: (res.headers["server"] as string) || null,
          responseTime: rt
        });
        res.resume();
      }
    );

    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

// Resolve subdomain and gather information
export async function resolveSubdomain(
  subdomain: string,
  httpProbe: boolean,
  timeoutMs: number,
  proxyUrl?: string,
  proxyIndex?: number,
  proxyList?: string[]
): Promise<SubdomainResult> {
  try {
    const res = await dns.resolve4(subdomain);
    let httpResult = null;

    // Determine which proxy to use
    let selectedProxy = proxyUrl;
    if (proxyList && proxyList.length > 0 && proxyIndex !== undefined) {
      selectedProxy = proxyList[proxyIndex % proxyList.length];
    }

    if (httpProbe) {
      httpResult = await probeHTTP(subdomain, false, timeoutMs, selectedProxy);
      if (!httpResult) {
        const httpsTry = await probeHTTP(subdomain, true, timeoutMs, selectedProxy);
        if (httpsTry) httpResult = httpsTry;
      }
    }

    const cdn = detectCDN(httpResult?.server || null);

    return {
      subdomain,
      resolved: true,
      ips: res,
      http: httpResult,
      cdn,
      confidence: httpResult ? "HIGH" : "MEDIUM"
    };
  } catch {
    return {
      subdomain,
      resolved: false,
      confidence: "LOW"
    };
  }
}

export async function runConcurrent(
  subs: string[],
  concurrency: number,
  httpProbe: boolean,
  timeoutMs: number,
  proxyUrl?: string,
  proxyList?: string[]
): Promise<SubdomainResult[]> {
  const queue = subs.map((sub, idx) => ({ sub, idx }));
  const results: SubdomainResult[] = [];
  let processedCount = 0;

  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      if (!item) continue;
      const proxyIndex = processedCount++;
      const r = await resolveSubdomain(
        item.sub,
        httpProbe,
        timeoutMs,
        proxyUrl,
        proxyIndex,
        proxyList
      );
      if (r.resolved) results.push(r);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results.sort((a, b) => a.subdomain.localeCompare(b.subdomain));
}

export interface FindOptions {
  timeoutMs?: number;
  concurrency?: number;
  httpProbe?: boolean;
  proxyUrl?: string;
  proxyList?: string[];
  queryTypes?: DNSRecordType[];
  reverseLookup?: boolean;
  zoneTransferCheck?: boolean;
}

export async function detectWildcard(domain: string): Promise<{ enabled: boolean; test: string }> {
  const test = `random-${Math.random().toString(36).slice(2)}.${domain}`;
  try {
    await dns.resolveAny(test);
    return { enabled: true, test };
  } catch {
    return { enabled: false, test };
  }
}

export async function findSubdomains(target: string, opts: FindOptions = {}): Promise<Output> {
  const timeoutMs = opts.timeoutMs ?? 2000;
  const concurrency = opts.concurrency ?? 15;
  const httpProbe = opts.httpProbe ?? false;
  const proxyUrl = opts.proxyUrl;
  const proxyList = opts.proxyList;
  const queryTypes = opts.queryTypes?.length ? opts.queryTypes : DEFAULT_QUERY_TYPES;
  const reverseLookupEnabled = opts.reverseLookup ?? true;
  const zoneTransferEnabled = opts.zoneTransferCheck ?? true;

  const start = Date.now();

  try {
    // Get nameservers for the target domain
    const nameservers = await getNameservers(target);

    const zoneTransferRecords: string[] = [];
    if (zoneTransferEnabled && nameservers.length) {
      for (const ns of nameservers) {
        const transferred = await attemptZoneTransfer(ns, target, timeoutMs);
        if (transferred.length) {
          zoneTransferRecords.push(ns);
        }
      }
    }
    
    // Enumerate subdomains from DNS records
    const enumeratedSubs = await enumerateFromDNS(target, queryTypes);
    const reverseSubs = await reverseEnumeration(target);
    
    // Combine all discovered subdomains
    const allSubdomains = new Set<string>();
    for (const [sub] of enumeratedSubs) {
      allSubdomains.add(sub);
    }
    for (const sub of reverseSubs) {
      if (sub && sub !== target) {
        allSubdomains.add(sub);
      }
    }

    const subdomainList = Array.from(allSubdomains);

    // Resolve subdomains
    const results = await runConcurrent(subdomainList, concurrency, httpProbe, timeoutMs, proxyUrl, proxyList);

    const uniqueIps = Array.from(
      new Set(results.flatMap(r => r.ips ?? []).filter(Boolean))
    ) as string[];
    const reverseRecords = reverseLookupEnabled
      ? await reverseLookupFromIps(uniqueIps)
      : [];

    const findings = results
      .filter(r => r.subdomain.includes(".dev") || r.subdomain.includes(".test"))
      .map(r => ({
        subdomain: r.subdomain,
        issue: "Potential development or testing subdomain exposed",
        severity: "HIGH" as const
      }));

    // Detect wildcard DNS
    const wildcard = await detectWildcard(target);

    const end = Date.now();

    const proxyInfo = proxyList ? proxyList.length : (proxyUrl ? 1 : 0);
    const output: Output = {
      success: true,
      target,
      scanInfo: {
        techniques: [
          "DNS_RECORD_ENUMERATION",
          "REVERSE_DNS",
          "NAMESERVER_LOOKUP",
          ...(zoneTransferEnabled ? ["ZONE_TRANSFER_CHECK"] : []),
          ...(httpProbe ? ["HTTP_PROBE"] : []),
          ...(proxyInfo > 0 ? ["PROXY"] : [])
        ],
        queryTypes,
        timeoutMs,
        concurrency,
        nameservers: nameservers.slice(0, 5),
        proxies: proxyList ? proxyList : (proxyUrl ? [proxyUrl] : undefined),
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
        durationMs: end - start,
        recordsEnumerated: subdomainList.length,
        subdomainsFound: results.length
      },
      wildcardDNS: {
        enabled: wildcard.enabled,
        testSubdomain: wildcard.test
      },
      zoneTransfer: {
        checked: zoneTransferEnabled,
        successfulNameservers: zoneTransferRecords
      },
      reverseLookup: {
        checked: reverseLookupEnabled,
        records: reverseRecords
      },
      dnsServers: {
        primary: nameservers.slice(0, 3)
      },
      subdomains: results,
      securityFindings: findings.length ? findings : undefined
    };

    return output;
  } catch (err: any) {
    const end = Date.now();
    return {
      success: false,
      target,
      scanInfo: {
        techniques: ["DNS_RECORD_ENUMERATION"],
        queryTypes,
        timeoutMs,
        concurrency,
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
        durationMs: end - start,
        recordsEnumerated: 0,
        subdomainsFound: 0
      },
      wildcardDNS: { enabled: false, testSubdomain: "" },
      zoneTransfer: {
        checked: zoneTransferEnabled,
        successfulNameservers: []
      },
      reverseLookup: {
        checked: reverseLookupEnabled,
        records: []
      },
      subdomains: [],
      securityFindings: [{
        subdomain: target,
        issue: `DNS enumeration failed: ${err?.message || String(err)}`,
        severity: "LOW"
      }]
    };
  }
}

async function mainCLI() {
  const target = process.argv[2];
  const timeoutMs = Number(process.argv.find(a => a.startsWith("--timeout="))?.split("=")[1]) || 2000;
  const concurrency = Number(process.argv.find(a => a.startsWith("--concurrency="))?.split("=")[1]) || 15;
  const httpProbe = process.argv.includes("--http-probe");
  const queryTypesArg = process.argv.find(a => a.startsWith("--query-types="))?.split("=")[1];
  const reverseLookup = readBooleanFlag(process.argv, "reverse-lookup", true);
  const zoneTransferCheck = readBooleanFlag(process.argv, "zone-transfer-check", true);
  const queryTypes = queryTypesArg
    ? queryTypesArg
        .split(",")
        .map(v => v.trim().toUpperCase() as DNSRecordType)
        .filter(v => DEFAULT_QUERY_TYPES.includes(v) || v === "SOA")
    : undefined;
  
  // Get single proxy or proxy file
  const proxyUrl = process.argv.find(a => a.startsWith("--proxy=") && !a.startsWith("--proxies-file="))?.split("=")[1];
  const proxiesFileArg = process.argv.find(a => a.startsWith("--proxies-file="))?.split("=")[1];
  
  let proxyList: string[] | undefined;
  
  // Parse proxies from file only
  if (proxiesFileArg) {
    try {
      const fileContent = fs.readFileSync(proxiesFileArg, "utf8");
      proxyList = fileContent
        .split(/\r?\n/)
        .map(p => p.trim())
        .filter(Boolean);
      if (proxyList.length === 0) {
        console.log(JSON.stringify({ 
          success: false, 
          error: `Proxy file is empty: ${proxiesFileArg}` 
        }, null, 2));
        process.exit(1);
      }
    } catch (err: any) {
      console.log(JSON.stringify({ 
        success: false, 
        error: `Failed to read proxy file: ${err?.message || String(err)}` 
      }, null, 2));
      process.exit(1);
    }
  }

  if (!target) {
    console.log(JSON.stringify({ 
      success: false, 
      error: "Usage: subdomain-finder <domain> [options]",
      options: {
        "--timeout=ms": "Timeout for DNS queries (default: 2000)",
        "--concurrency=n": "Number of concurrent requests (default: 15)",
        "--http-probe": "Probe for HTTP/HTTPS services",
        "--query-types=A,AAAA,MX": "DNS query types to enumerate",
        "--reverse-lookup=true|false": "Enable reverse DNS lookup for resolved IPs",
        "--zone-transfer-check=true|false": "Enable zone transfer checks on nameservers",
        "--proxy=url": "Single proxy URL",
        "--proxies-file=path/to/file.txt": "Read proxies from file (one per line)"
      }
    }, null, 2));
    process.exit(1);
  }

  try {
    const res = await findSubdomains(target, {
      timeoutMs,
      concurrency,
      httpProbe,
      proxyUrl,
      proxyList,
      queryTypes,
      reverseLookup,
      zoneTransferCheck
    });
    console.log(JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.log(JSON.stringify({ success: false, error: err?.message || String(err) }, null, 2));
    process.exit(1);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  mainCLI();
}

export default findSubdomains;

function readBooleanFlag(args: string[], name: string, defaultValue: boolean): boolean {
  const raw = args.find(a => a.startsWith(`--${name}=`))?.split("=")[1];
  if (raw === undefined) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return defaultValue;
}
