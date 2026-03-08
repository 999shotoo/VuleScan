#!/usr/bin/env node
import {
  scanNetwork,
  PRESETS,
  PortPreset,
  ScanResult,
  ProxyOption,
  parseProxyListFile,
  BUILTIN_PROXY,
  ScanTechnique
} from "./scan.js";

// Parse CLI arguments
const args = process.argv.slice(2);
const target = args.find(arg => !arg.startsWith("--")) ?? "";
const timeoutMs = Number(args.find(arg => arg.startsWith("--timeout="))?.split("=")[1]) || 2000;
const presetArg = args.find(arg => arg.startsWith("--preset="))?.split("=")[1] as PortPreset;
const concurrency = Number(args.find(arg => arg.startsWith("--concurrency="))?.split("=")[1]) || 10;
const checkVulns = args.includes("--check-vulns");
const hostDiscovery = readBooleanFlag(args, "host-discovery", true);
const versionDetection = readBooleanFlag(args, "version-detection", true);
const osDetection = readBooleanFlag(args, "os-detection", true);
const networkMapping = readBooleanFlag(args, "network-mapping", true);
const firewallDetection = readBooleanFlag(args, "firewall-detection", true);
const scanType = readScanType(args.find(arg => arg.startsWith("--scan-type="))?.split("=")[1]);
const scripts = args
  .find(arg => arg.startsWith("--scripts="))
  ?.split("=")[1]
  ?.split(",")
  .map(v => v.trim())
  .filter(Boolean);
const customPorts = args.find(arg => arg.startsWith("--ports="))?.split("=")[1];
const proxyArg = args.find(arg => arg.startsWith("--proxy="))?.split("=")[1];
const proxyListArg = args.find(arg => arg.startsWith("--proxy-list="))?.split("=")[1];
const useBuiltinProxy = args.includes("--use-builtin-proxy");
const showHelp = args.includes("--help") || !target;

// Parse proxy configuration - support 3 modes:
// 1. No proxy (default)
// 2. Built-in proxy (--use-builtin-proxy)
// 3. Proxy list from file (--proxy-list=file.txt)
// Also support single proxy (--proxy=...)
let proxy: ProxyOption;
if (useBuiltinProxy) {
  proxy = "builtin";
  console.error(`Using built-in proxy: ${BUILTIN_PROXY.host}:${BUILTIN_PROXY.port}`);
} else if (proxyListArg) {
  try {
    const proxies = parseProxyListFile(proxyListArg);
    proxy = {
      proxies,
      rotationStrategy: "round-robin"
    };
    console.error(`Loaded ${proxies.length} proxies from ${proxyListArg}`);
  } catch (e) {
    console.error(JSON.stringify({ 
      success: false, 
      error: `Failed to load proxy list: ${(e as Error).message}` 
    }, null, 2));
    process.exit(1);
  }
} else if (proxyArg) {
  try {
    const proxyUrl = new URL(proxyArg.includes("://") ? proxyArg : `http://${proxyArg}`);
    proxy = {
      host: proxyUrl.hostname || "",
      port: Number(proxyUrl.port) || (proxyUrl.protocol === "https:" ? 443 : 80),
      type: (proxyUrl.protocol?.replace(":", "") as "http" | "https" | "socks5") || "http",
      username: proxyUrl.username || undefined,
      password: proxyUrl.password || undefined
    };
  } catch (e) {
    console.error(JSON.stringify({ 
      success: false, 
      error: "Invalid proxy format. Use --proxy=http://host:port or --proxy=socks5://host:port" 
    }, null, 2));
    process.exit(1);
  }
}

function printErrorJson(message: string) {
  console.log(JSON.stringify({ success: false, error: message }, null, 2));
}

if (showHelp) {
  printErrorJson("Usage: npx network-scan <host> [options]");
  console.log(JSON.stringify({
    success: false,
    help: {
      usage: "npx network-scan <host> [options]",
      options: {
        "--preset": "TOP_100|TOP_1000|WEB|DATABASE|MAIL|ALL (default: TOP_100)",
        "--ports": "Custom port list (e.g., 80,443,8080)",
        "--timeout": "Timeout in ms (default: 2000)",
        "--concurrency": "Concurrent scans (default: 10, max: 100)",
        "--host-discovery": "Enable/disable host discovery (default: true)",
        "--version-detection": "Enable/disable service version detection (default: true)",
        "--os-detection": "Enable/disable OS fingerprint guessing (default: true)",
        "--network-mapping": "Enable/disable network map output (default: true)",
        "--firewall-detection": "Enable/disable firewall detection (default: true)",
        "--scan-type": "TCP_CONNECT|FAST_CONNECT|SERVICE_DETECT",
        "--scripts": "Comma-separated scripts (default,banner-check,ftp-anon,web-title) or none to disable",
        "--proxy": "Single proxy (e.g., http://proxy.example.com:8080 or socks5://proxy:1080)",
        "--use-builtin-proxy": "Use the built-in proxy configuration",
        "--proxy-list": "Path to proxy list file (one proxy per line)",
        "--check-vulns": "Check for common vulnerabilities",
        "--help": "Show this help message"
      },
      proxyModes: {
        "1. Without proxy": "Don't use any proxy flags (default behavior)",
        "2. Built-in proxy": "Use --use-builtin-proxy flag",
        "3. Proxy list": "Use --proxy-list=proxies.txt flag"
      },
      examples: {
        basic: "network-scan example.com",
        withBuiltinProxy: "network-scan example.com --use-builtin-proxy",
        withProxyList: "network-scan example.com --proxy-list=proxies.txt",
        withSingleProxy: "network-scan example.com --proxy=http://proxy.example.com:8080",
        withSocks5: "network-scan example.com --proxy=socks5://proxy.example.com:1080",
        custom: "network-scan 192.168.1.0/24 --ports=22,80,443 --scan-type=SERVICE_DETECT --scripts=default,banner-check"
      }
    }
  }, null, 2));
  process.exit(target ? 0 : 1);
}

const ports = customPorts
  ? customPorts.split(",").map(p => Number(p.trim()))
  : undefined;

const preset = customPorts
  ? undefined
  : (presetArg || "TOP_100");

scanNetwork(target, {
  ports,
  timeoutMs,
  preset,
  concurrency,
  checkVulns,
  proxy,
  hostDiscovery,
  versionDetection,
  osDetection,
  networkMapping,
  firewallDetection,
  scanType,
  scripts
})
  .then((result : ScanResult)=> {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err: Error) => {
    printErrorJson(err?.message || "Scan failed");
    process.exit(1);
  });

function readBooleanFlag(argsList: string[], name: string, defaultValue: boolean): boolean {
  const raw = argsList.find(arg => arg.startsWith(`--${name}=`))?.split("=")[1];
  if (raw === undefined) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  throw new Error(`Invalid value for --${name}. Use true or false.`);
}

function readScanType(raw?: string): ScanTechnique | undefined {
  if (!raw) return undefined;
  if (raw === "TCP_CONNECT" || raw === "FAST_CONNECT" || raw === "SERVICE_DETECT") {
    return raw;
  }
  throw new Error("Invalid --scan-type value. Use TCP_CONNECT, FAST_CONNECT, or SERVICE_DETECT.");
}
