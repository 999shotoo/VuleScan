import fs from "fs/promises";
import http from "http";
import https from "https";
import { URL } from "url";
import { performance } from "perf_hooks";
import { InvalidInputError, FileSystemError } from "./errors.js";
import { ProxyManager } from "./network/proxyManager.js";
import type { ProxyOptions } from "./network/proxyManager.js";

/* =======================
   Types
======================= */

export type Result = {
  path: string;
  status: number;
  length: number;
  server: string | null;
  responseTime: number;
};

export type ScanOptions = {
  timeoutMs?: number;
  concurrency?: number;
  threads?: number;
  extensions?: string[];
  includeHidden?: boolean;
  hiddenEntries?: string[];
  proxy?: ProxyOptions;
};

export type ScanInfo = {
  wordlist: string;
  totalRequests: number;
  concurrency: number;
  timeoutMs: number;
  startTime: string;
  endTime: string;
  durationMs: number;
  found: number;
};

export type Output = {
  success: boolean;
  target: string;
  scanInfo: ScanInfo;
  techHints: {
    server?: string;
    osGuess?: string;
  };
  results: Result[];
};

/* =======================
   Defaults
======================= */

const DEFAULT_TIMEOUT = 3000;
const DEFAULT_CONCURRENCY = 10;
const DEFAULT_EXTENSIONS = ["", ".php", ".html", ".js", ".bak", ".old"];
const DEFAULT_HIDDEN_ENTRIES = [
  ".env",
  ".git",
  ".gitignore",
  ".svn",
  ".DS_Store",
  ".htaccess",
  ".htpasswd",
  ".well-known",
  ".idea",
  ".vscode"
];

/* =======================
   Main Function
======================= */

export async function scanDirectory(
  target: string,
  wordlistPath: string,
  options: ScanOptions = {}
): Promise<Output> {
  if (!target) throw new InvalidInputError("Target URL is required");
  if (!wordlistPath) throw new InvalidInputError("Wordlist path is required");

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  const requestedConcurrency = options.threads ?? options.concurrency;
  const concurrency = Math.max(
    1,
    Math.min(requestedConcurrency ?? DEFAULT_CONCURRENCY, 100)
  );
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
  const includeHidden = options.includeHidden ?? true;
  const hiddenEntries = options.hiddenEntries ?? DEFAULT_HIDDEN_ENTRIES;

  let urlObj: URL;
  try {
    urlObj = new URL(target);
  } catch {
    try {
      urlObj = new URL(`https://${target}`);
    } catch {
      throw new InvalidInputError("Invalid URL format");
    }
  }

  const client = urlObj.protocol === "https:" ? https : http;

  const proxyManager = await ProxyManager.create(urlObj, options.proxy);

  /* =======================
     HTTP Request Helper
  ======================= */

  async function requestPath(pathname: string): Promise<Result | null> {
    return new Promise(resolve => {
      const start = performance.now();

      const req = client.request(
        {
          hostname: urlObj.hostname,
          path: pathname,
          port: urlObj.port
            ? Number(urlObj.port)
            : urlObj.protocol === "https:"
            ? 443
            : 80,
          method: "GET",
          timeout: timeoutMs,
          agent: proxyManager?.getAgentForRequest()
        },
        res => {
          const responseTime = Math.round(performance.now() - start);
          const length = Number(res.headers["content-length"] || 0);
          const server = res.headers["server"]?.toString() ?? null;

          if (res.statusCode && res.statusCode < 500 && res.statusCode !== 404) {
            resolve({
              path: pathname,
              status: res.statusCode,
              length,
              server,
              responseTime
            });
          } else {
            resolve(null);
          }

          res.resume(); // consume response
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

  /* =======================
     Load Wordlist
  ======================= */

  let words: string[];
  try {
    const file = await fs.readFile(wordlistPath, "utf8");
    words = file
      .split(/\r?\n/)
      .map(w => w.trim())
      .filter(Boolean);
  } catch (err) {
    throw new FileSystemError("Failed to read wordlist file", err);
  }

  const standardPaths = words.flatMap(word =>
    extensions.map(ext => `/${word}${ext}`)
  );

  const hiddenPaths = includeHidden
    ? hiddenEntries.flatMap(entry => {
        if (entry.startsWith("/.")) {
          return [entry];
        }
        if (entry.startsWith(".")) {
          return [`/${entry}`];
        }
        return [`/.${entry}`];
      })
    : [];

  const paths = Array.from(new Set([...standardPaths, ...hiddenPaths]));

  /* =======================
     Worker Pool
  ======================= */

  const results: Result[] = [];
  let index = 0;

  async function worker() {
    while (true) {
      const i = index++;
      if (i >= paths.length) break;

      const res = await requestPath(paths[i]);
      if (res) results.push(res);
    }
  }

  const startTime = Date.now();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const endTime = Date.now();

  /* =======================
     Tech Hints
  ======================= */

  const serverHeader: string | undefined =
    results.find(r => r.server)?.server ?? undefined;

  let osGuess: string | undefined;
  if (serverHeader?.toLowerCase().includes("windows")) osGuess = "Windows";
  if (
    serverHeader?.toLowerCase().includes("ubuntu") ||
    serverHeader?.toLowerCase().includes("unix")
  ) {
    osGuess = "Linux/Unix";
  }

  /* =======================
     Output
  ======================= */

  return {
    success: true,
    target,
    scanInfo: {
      wordlist: wordlistPath,
      totalRequests: paths.length,
      concurrency,
      timeoutMs,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      durationMs: endTime - startTime,
      found: results.length
    },
    techHints: {
      server: serverHeader,
      osGuess
    },
    results: results.sort((a, b) => a.path.localeCompare(b.path))
  };
}
