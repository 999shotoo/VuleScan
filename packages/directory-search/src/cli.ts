#!/usr/bin/env node
import { scanDirectory } from "./scanDirectory.js";
import { InvalidInputError, FileSystemError } from "./errors.js";
import type { ProxyMode, ProxyRotate } from "./network/proxyManager.js";
import path from "path";
import { fileURLToPath } from "url";

const DEFAULT_WORDLIST_PATH = path.resolve(
  fileURLToPath(new URL("../../../wordlists/common.txt", import.meta.url))
);

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(
      JSON.stringify(
        {
          usage:
            "directory-search <url> [wordlist.txt] [--wordlist=path] [--timeout=3000] [--concurrency=10|--threads=10] [--include-hidden=true|false] [--hidden-entries=.env,.git,.htaccess] [--proxy-mode=none|single|list] [--proxy-host=host] [--proxy-port=8080] [--proxy-username=user] [--proxy-password=pass] [--proxy-file=proxies.txt] [--proxy-rotate=round-robin|random]"
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  const [target, positionalWordlist] = args;

  const timeoutMs = readNumberFlag(args, "timeout");
  const threads = readNumberFlag(args, "threads");
  const concurrency = readNumberFlag(args, "concurrency") ?? threads;
  const includeHidden = readBooleanFlag(args, "include-hidden");
  const hiddenEntriesRaw = readStringFlag(args, "hidden-entries");
  const hiddenEntries = hiddenEntriesRaw
    ? hiddenEntriesRaw
        .split(",")
        .map(entry => entry.trim())
        .filter(Boolean)
    : undefined;

  const proxyMode = readProxyMode(args);
  const proxyRotate = readProxyRotate(args);
  const proxyHost = readStringFlag(args, "proxy-host");
  const proxyPort = readNumberFlag(args, "proxy-port");
  const proxyUsername = readStringFlag(args, "proxy-username");
  const proxyPassword = readStringFlag(args, "proxy-password");
  const proxyFile = readStringFlag(args, "proxy-file");
  const flagWordlist = readStringFlag(args, "wordlist");
  const wordlistPath = flagWordlist || positionalWordlist || DEFAULT_WORDLIST_PATH;

  try {
    const result = await scanDirectory(target, wordlistPath, {
      timeoutMs,
      concurrency,
      threads,
      includeHidden,
      hiddenEntries,
      proxy: {
        mode: proxyMode,
        host: proxyHost,
        port: proxyPort,
        username: proxyUsername,
        password: proxyPassword,
        file: proxyFile,
        rotate: proxyRotate
      }
    });
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    let message = "Unknown error";
    if (err instanceof InvalidInputError || err instanceof FileSystemError) {
      message = err.message;
    }
    console.log(JSON.stringify({ success: false, error: message }, null, 2));
    process.exit(1);
  }
}

function readBooleanFlag(args: string[], name: string): boolean | undefined {
  const value = readStringFlag(args, name);
  if (value === undefined) return undefined;

  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;

  throw new InvalidInputError(`Invalid value for --${name}. Use true or false`);
}

main();

function readStringFlag(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const index = args.findIndex(
    arg => arg === `--${name}` || arg.startsWith(prefix)
  );
  if (index === -1) return undefined;

  const arg = args[index];
  if (arg.startsWith(prefix)) return arg.slice(prefix.length);

  const next = args[index + 1];
  if (next && !next.startsWith("--")) return next;

  return undefined;
}

function readNumberFlag(args: string[], name: string): number | undefined {
  const value = readStringFlag(args, name);
  if (value === undefined) return undefined;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new InvalidInputError(`Invalid value for --${name}`);
  }

  return parsed;
}

function readProxyMode(args: string[]): ProxyMode | undefined {
  const value = readStringFlag(args, "proxy-mode");
  if (!value) return undefined;
  if (value === "none" || value === "single" || value === "list") return value;
  throw new InvalidInputError("Invalid --proxy-mode value");
}

function readProxyRotate(args: string[]): ProxyRotate | undefined {
  const value = readStringFlag(args, "proxy-rotate");
  if (!value) return undefined;
  if (value === "round-robin" || value === "random") return value;
  throw new InvalidInputError("Invalid --proxy-rotate value");
}
