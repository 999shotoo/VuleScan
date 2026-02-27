#!/usr/bin/env node

import process from "node:process";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { bruteForce } from "../engine/bruteForceEngine.js";
import { bruteForceCredentials } from "../engine/credentialEngine.js";
import { SupportedAlgorithm } from "../hash/index.js";
import type { ProxyMode, ProxyRotateStrategy } from "../network/proxyManager.js";
import { ProxyManager } from "../network/proxyManager.js";
import { WordSource } from "../wordlist/types.js";
import { createService, type ServiceType } from "../services/index.js";
import path from "path";
import { fileURLToPath } from "url";

const DEFAULT_WORDLIST_PATH = path.resolve(
  fileURLToPath(new URL("../../../../wordlists/common.txt", import.meta.url))
);

type CliArgs = {
  // Attack mode
  mode?: "hash" | "ssh" | "http" | "ftp" | "smtp" | "pop3" | "imap" | "telnet";
  attack?: "credential" | "password-spray" | "username-spray";
  
  // Hash mode args
  hash?: string;
  algo?: "md5" | "sha256";
  
  // Credential mode args
  service?: ServiceType;
  target?: string;
  port?: number;
  url?: string;
  
  // Common args
  wordlist?: string;
  words?: string;
  userlist?: string;
  usernames?: string;
  passwordlist?: string;
  passwords?: string;
  concurrency: number;
  threads?: number;
  timeout?: number;
  quiet: boolean;
  proxyMode: ProxyMode;
  proxyHost?: string;
  proxyPort?: number;
  proxyUsername?: string;
  proxyPassword?: string;
  proxyFile?: string;
  proxyRotate: ProxyRotateStrategy;
};

const argv = yargs(hideBin(process.argv))
  // Mode selection
  .option("mode", {
    choices: ["hash", "ssh", "http", "ftp", "smtp", "pop3", "imap", "telnet"] as const,
    describe: "Attack mode: hash cracking or credential brute force"
  })
  .option("attack", {
    choices: ["credential", "password-spray", "username-spray"] as const,
    default: "credential",
    describe: "Credential attack strategy"
  })
  
  // Hash mode options
  .option("hash", {
    type: "string",
    describe: "Target hash (for hash mode)"
  })
  .option("algo", {
    choices: ["md5", "sha256"] as const,
    describe: "Hash algorithm (for hash mode)"
  })
  
  // Credential mode options
  .option("service", {
    choices: ["ssh", "http", "ftp", "smtp", "pop3", "imap", "telnet"] as const,
    describe: "Target service (for credential mode)"
  })
  .option("target", {
    type: "string",
    describe: "Target host (for SSH/FTP)"
  })
  .option("url", {
    type: "string",
    describe: "Target URL (for HTTP)"
  })
  .option("port", {
    type: "number",
    describe: "Target port"
  })
  
  // Wordlist options
  .option("wordlist", {
    type: "string",
    describe: "Path to wordlist file (defaults to built-in wordlist)"
  })
  .option("words", {
    type: "string",
    describe: "Comma-separated custom words"
  })
  .option("userlist", {
    type: "string",
    describe: "Path to username list file (defaults to built-in wordlist)"
  })
  .option("usernames", {
    type: "string",
    describe: "Comma-separated usernames"
  })
  .option("passwordlist", {
    type: "string",
    describe: "Path to password list file (defaults to built-in wordlist)"
  })
  .option("passwords", {
    type: "string",
    describe: "Comma-separated passwords"
  })
  
  // Performance options
  .option("concurrency", {
    type: "number",
    default: 4,
    describe: "Parallel workers"
  })
  .option("threads", {
    type: "number",
    describe: "Alias for --concurrency"
  })
  .option("timeout", {
    type: "number",
    describe: "Timeout in seconds"
  })
  .option("quiet", {
    type: "boolean",
    default: false,
    describe: "Disable progress output"
  })
  
  // Proxy options
  .option("proxy-mode", {
    choices: ["none", "single", "list"] as const,
    default: "none",
    describe: "Proxy mode"
  })
  .option("proxy-host", {
    type: "string",
    describe: "Proxy host or URL"
  })
  .option("proxy-port", {
    type: "number",
    describe: "Proxy port"
  })
  .option("proxy-username", {
    type: "string",
    describe: "Proxy username"
  })
  .option("proxy-password", {
    type: "string",
    describe: "Proxy password"
  })
  .option("proxy-file", {
    type: "string",
    describe: "Path to proxy list file"
  })
  .option("proxy-rotate", {
    choices: ["round-robin", "random"] as const,
    default: "round-robin",
    describe: "Proxy rotation strategy"
  })
  .parseSync() as CliArgs;

/**
 * Handle Ctrl+C
 */
const controller = new AbortController();
process.on("SIGINT", () => controller.abort());

/**
 * Resolve proxy configuration
 */
let proxyManager: ProxyManager | undefined;
try {
  proxyManager = await ProxyManager.create({
    mode: argv.proxyMode,
    single: argv.proxyHost
      ? {
          host: argv.proxyHost,
          port: argv.proxyPort,
          username: argv.proxyUsername,
          password: argv.proxyPassword
        }
      : undefined,
    list: argv.proxyFile
      ? {
          filePath: argv.proxyFile,
          rotate: argv.proxyRotate
        }
      : undefined
  });
} catch (error) {
  const message = error instanceof Error ? error.message : "Proxy error.";
  console.error(`❌ ${message}`);
  process.exit(1);
}

// Determine mode
const mode = argv.mode || (argv.hash ? "hash" : argv.service ? argv.service : null);
const concurrency = argv.threads ?? argv.concurrency;

if (!mode) {
  console.error("❌ Specify a mode: --mode hash|ssh|http|ftp or provide --hash and --algo");
  process.exit(1);
}

let result;

if (mode === "hash") {
  // Hash cracking mode
  if (!argv.hash || !argv.algo) {
    console.error("❌ Hash mode requires --hash and --algo");
    process.exit(1);
  }

  let source: WordSource;
  if (argv.wordlist) {
    source = { type: "file", path: argv.wordlist };
  } else if (argv.words) {
    source = {
      type: "array",
      words: argv.words.split(",").map(w => w.trim()).filter(Boolean)
    };
  } else {
    source = { type: "file", path: DEFAULT_WORDLIST_PATH };
  }

  result = await bruteForce({
    hash: argv.hash.toLowerCase(),
    algorithm: argv.algo as SupportedAlgorithm,
    source,
    concurrency,
    timeout: argv.timeout,
    signal: controller.signal,
    proxyManager,
    onProgress: argv.quiet
      ? undefined
      : stats => process.stderr.write(`[${stats.tested}] ${stats.speed} hashes/sec\n`)
  });
} else {
  // Credential brute force mode
  let userSource: WordSource;
  let passSource: WordSource;

  // Resolve username source
  if (argv.userlist) {
    userSource = { type: "file", path: argv.userlist };
  } else if (argv.usernames) {
    userSource = {
      type: "array",
      words: argv.usernames.split(",").map(w => w.trim()).filter(Boolean)
    };
  } else {
    userSource = { type: "file", path: DEFAULT_WORDLIST_PATH };
  }

  // Resolve password source
  if (argv.passwordlist) {
    passSource = { type: "file", path: argv.passwordlist };
  } else if (argv.passwords) {
    passSource = {
      type: "array",
      words: argv.passwords.split(",").map(w => w.trim()).filter(Boolean)
    };
  } else if (argv.wordlist) {
    // Fallback to wordlist for passwords
    passSource = { type: "file", path: argv.wordlist };
  } else if (argv.words) {
    passSource = {
      type: "array",
      words: argv.words.split(",").map(w => w.trim()).filter(Boolean)
    };
  } else {
    passSource = { type: "file", path: DEFAULT_WORDLIST_PATH };
  }

  // Create service based on mode
  let service;
  try {
    if (mode === "ssh") {
      if (!argv.target) {
        console.error("❌ SSH mode requires --target (hostname)");
        process.exit(1);
      }
      service = createService("ssh", {
        host: argv.target,
        port: argv.port || 22,
        timeout: argv.timeout
      });
    } else if (mode === "http") {
      if (!argv.url) {
        console.error("❌ HTTP mode requires --url");
        process.exit(1);
      }
      service = createService("http", {
        url: argv.url,
        timeout: argv.timeout
      });
    } else if (mode === "ftp") {
      if (!argv.target) {
        console.error("❌ FTP mode requires --target (hostname)");
        process.exit(1);
      }
      service = createService("ftp", {
        host: argv.target,
        port: argv.port || 21,
        timeout: argv.timeout
      });
    } else if (mode === "smtp") {
      if (!argv.target) {
        console.error("❌ SMTP mode requires --target (hostname)");
        process.exit(1);
      }
      service = createService("smtp", {
        host: argv.target,
        port: argv.port || 25,
        timeout: argv.timeout
      });
    } else if (mode === "pop3") {
      if (!argv.target) {
        console.error("❌ POP3 mode requires --target (hostname)");
        process.exit(1);
      }
      service = createService("pop3", {
        host: argv.target,
        port: argv.port || 110,
        timeout: argv.timeout
      });
    } else if (mode === "imap") {
      if (!argv.target) {
        console.error("❌ IMAP mode requires --target (hostname)");
        process.exit(1);
      }
      service = createService("imap", {
        host: argv.target,
        port: argv.port || 143,
        timeout: argv.timeout
      });
    } else if (mode === "telnet") {
      if (!argv.target) {
        console.error("❌ Telnet mode requires --target (hostname)");
        process.exit(1);
      }
      service = createService("telnet", {
        host: argv.target,
        port: argv.port || 23,
        timeout: argv.timeout
      });
    } else {
      console.error(`❌ Unknown service: ${mode}`);
      process.exit(1);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Service creation failed";
    console.error(`❌ ${msg}`);
    process.exit(1);
  }

  result = await bruteForceCredentials({
    service,
    usernames: userSource,
    passwords: passSource,
    concurrency,
    attackMode: argv.attack,
    signal: controller.signal,
    onProgress: argv.quiet
      ? undefined
      : stats => {
          if (stats.found) {
            process.stderr.write(
              `[${stats.tested}] ${stats.speed} attempts/sec - FOUND: ${stats.foundCredentials?.username}:${stats.foundCredentials?.password}\n`
            );
          } else {
            process.stderr.write(`[${stats.tested}] ${stats.speed} attempts/sec\n`);
          }
        }
  });

  await service.close();
}

/**
 * Output result as JSON
 */
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(result.success ? 0 : 1);
