#!/usr/bin/env node
import { analyzeEncryption } from "./analyzer.js";
import {
  AnalyzerOptions,
  ProxyConfig,
  ProxyMode,
  ProxyRotateStrategy
} from "./types.js";
import path from "path";
import { fileURLToPath } from "url";

const DEFAULT_WORDLIST_PATH = path.resolve(
  fileURLToPath(new URL("../../../wordlists/common.txt", import.meta.url))
);

function printHelp() {
  console.log(
    JSON.stringify(
      {
        success: false,
        error: "Usage: npx my-encryption-analyzer <hash> [wordlist.txt] [options]",
        options: {
          "--mutations": "Try common password mutations",
          "--verbose": "Show detailed progress",
          "--quick": "Skip wordlist, only try common passwords",
          "--proxy-mode": "none | single | list",
          "--proxy-host": "Proxy host or full URL (e.g. socks5://127.0.0.1:9050)",
          "--proxy-port": "Proxy port when using --proxy-host without a URL",
          "--proxy-username": "Proxy username (single mode)",
          "--proxy-password": "Proxy password (single mode)",
          "--proxy-file": "Proxy list file path (list mode)",
          "--proxy-rotate": "round-robin | random",
          "--wordlist": "Path to custom wordlist (optional)",
          "--help": "Show this help message"
        }
      },
      null,
      2
    )
  );
}

function buildProxyConfig(
  argv: string[],
  flagValues: Map<string, string>
): ProxyConfig | undefined {
  const hasProxyFlags = argv.some(arg => arg.startsWith("--proxy-"));
  if (!hasProxyFlags) {
    return undefined;
  }

  const modeValue = flagValues.get("--proxy-mode");
  if (!modeValue) {
    throw new Error("Missing --proxy-mode value.");
  }

  const mode = parseProxyMode(modeValue);
  if (mode === "none") {
    return { mode: "none" };
  }

  if (mode === "list") {
    const file = flagValues.get("--proxy-file");
    if (!file) {
      throw new Error("Missing --proxy-file for proxy list mode.");
    }

    const rotateValue = flagValues.get("--proxy-rotate");
    return {
      mode: "list",
      file,
      rotate: rotateValue ? parseProxyRotate(rotateValue) : undefined
    };
  }

  const hostValue = flagValues.get("--proxy-host");
  if (!hostValue) {
    throw new Error("Missing --proxy-host for proxy single mode.");
  }

  const portValue = flagValues.get("--proxy-port");
  const username = flagValues.get("--proxy-username");
  const password = flagValues.get("--proxy-password");

  if ((username && !password) || (!username && password)) {
    throw new Error("Proxy username and password must be provided together.");
  }

  if (hostValue.includes("://")) {
    const url = parseProxyUrlWithOverrides(hostValue, portValue, username, password);
    return {
      mode: "single",
      url: url.toString()
    };
  }

  if (!portValue) {
    throw new Error("Missing --proxy-port for proxy single mode.");
  }

  return {
    mode: "single",
    host: hostValue,
    port: parseProxyPort(portValue),
    username: username ?? undefined,
    password: password ?? undefined
  };
}

function parseProxyMode(value: string): ProxyMode {
  if (value === "none" || value === "single" || value === "list") {
    return value;
  }
  throw new Error(`Invalid --proxy-mode value: ${value}`);
}

function parseProxyRotate(value: string): ProxyRotateStrategy {
  if (value === "round-robin" || value === "random") {
    return value;
  }
  throw new Error(`Invalid --proxy-rotate value: ${value}`);
}

function parseProxyPort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid --proxy-port value: ${value}`);
  }
  return port;
}

function parseProxyUrlWithOverrides(
  value: string,
  portValue?: string,
  username?: string,
  password?: string
): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid proxy URL: ${value}`);
  }

  if (!isSupportedProxyProtocol(url.protocol)) {
    throw new Error(`Unsupported proxy protocol: ${url.protocol}`);
  }

  if (!url.hostname) {
    throw new Error("Proxy host is missing in --proxy-host.");
  }

  if (portValue) {
    if (url.port) {
      throw new Error("--proxy-port cannot be used when --proxy-host already includes a port.");
    }
    url.port = String(parseProxyPort(portValue));
  }

  if (username || password) {
    if (url.username || url.password) {
      throw new Error("Proxy credentials cannot be provided twice.");
    }
    if (!username || !password) {
      throw new Error("Proxy username and password must be provided together.");
    }
    url.username = username;
    url.password = password;
  }

  if (!url.port) {
    throw new Error("Proxy URL must include a port or provide --proxy-port.");
  }

  return url;
}

function isSupportedProxyProtocol(protocol: string): boolean {
  return protocol === "http:" || protocol === "https:" || protocol === "socks5:";
}

async function main() {
  const argv = process.argv.slice(2);
  const valueFlags = new Set([
    "--proxy-mode",
    "--proxy-host",
    "--proxy-port",
    "--proxy-username",
    "--proxy-password",
    "--proxy-file",
    "--proxy-rotate",
    "--wordlist"
  ]);

  const positionalArgs: string[] = [];
  const flagValues = new Map<string, string>();

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (valueFlags.has(arg)) {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}.`);
      }
      flagValues.set(arg, value);
      i += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      continue;
    }

    positionalArgs.push(arg);
  }

  const input = positionalArgs[0];
  const wordlistPath = flagValues.get("--wordlist") || positionalArgs[1] || DEFAULT_WORDLIST_PATH;

  if (!input || argv.includes("--help")) {
    printHelp();
    process.exit(1);
  }

  try {
    const proxyConfig = buildProxyConfig(argv, flagValues);

    const options: AnalyzerOptions = {
      mutations: argv.includes("--mutations"),
      verbose: argv.includes("--verbose"),
      quick: argv.includes("--quick"),
      wordlistPath,
      proxy: proxyConfig
    };

    const result = await analyzeEncryption(input, options);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.result.cracked ? 0 : 2);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";

    console.log(
      JSON.stringify(
        {
          success: false,
          error: message
        },
        null,
        2
      )
    );
    process.exit(1);
  }
}

main();
