#!/usr/bin/env node

import { readFile } from "fs/promises";
import crypto from "crypto";

interface AppError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function formatError(
  message: string,
  code = "UNKNOWN_ERROR",
  details?: unknown
): AppError {
  return { success: false, error: { code, message, details } };
}

async function loadWordlist(path: string): Promise<string[] | AppError> {
  try {
    const content = await readFile(path, "utf8");

    const words = content
      .split(/\r?\n/)
      .map((w: string) => w.trim())
      .filter(Boolean);

    if (words.length === 0) {
      return formatError("Wordlist is empty", "EMPTY_WORDLIST");
    }

    return words;
  } catch (err) {
    return formatError("Failed to read wordlist", "WORDLIST_ERROR", err);
  }
}

function hashValue(value: string, algo: string): string {
  return crypto.createHash(algo).update(value).digest("hex");
}

function validateHash(hash: string, algorithm: string): boolean {
  const expectedLength = algorithm === "md5" ? 32 : 64;
  return /^[a-f0-9]+$/i.test(hash) && hash.length === expectedLength;
}

async function run() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error(JSON.stringify(
      formatError(
        "Usage: brute-force <hash> <md5|sha256> <wordlist.txt>",
        "INVALID_ARGUMENTS"
      ),
      null,
      2
    ));
    process.exit(1);
  }

  const targetHash = args[0].toLowerCase();
  const algorithm = args[1].toLowerCase();
  const wordlistFile = args[2];

  if (!["md5", "sha256"].includes(algorithm)) {
    console.error(JSON.stringify(
      formatError("Unsupported hash type. Use md5 or sha256", "INVALID_HASH"),
      null,
      2
    ));
    process.exit(1);
  }

  if (!validateHash(targetHash, algorithm)) {
    console.error(JSON.stringify(
      formatError(
        `Invalid ${algorithm.toUpperCase()} hash format`,
        "INVALID_HASH_FORMAT"
      ),
      null,
      2
    ));
    process.exit(1);
  }

  const words = await loadWordlist(wordlistFile);
  if ("error" in words) {
    console.error(JSON.stringify(words, null, 2));
    process.exit(1);
  }

  const startTime = Date.now();

  console.log(`\nTarget Hash : ${targetHash}`);
  console.log(`Algorithm   : ${algorithm.toUpperCase()}`);
  console.log(`Total Words : ${words.length}\n`);

  let tested = 0;
  const updateInterval = Math.max(1, Math.floor(words.length / 100));

  for (const word of words) {
    tested++;

    if (tested % updateInterval === 0 || tested === 1) {
      process.stdout.write(
        `\r[${tested}/${words.length}] Testing... ${(
          (tested / words.length) * 100
        ).toFixed(1)}%`
      );
    }

    const hashed = hashValue(word, algorithm);

    if (hashed === targetHash) {
      const durationSec = (Date.now() - startTime) / 1000;

      console.log("\n\n PASSWORD FOUND");
      console.log(JSON.stringify(
        {
          success: true,
          password: word,
          attempts: tested,
          duration: `${durationSec.toFixed(2)}s`,
          speed: `${Math.round(tested / durationSec)} hashes/sec`
        },
        null,
        2
      ));
      process.exit(0);
    }
  }

  const durationSec = (Date.now() - startTime) / 1000;

  console.log("\n\n PASSWORD NOT FOUND");
  console.log(JSON.stringify(
    {
      success: true,
      password: null,
      attempts: tested,
      duration: `${durationSec.toFixed(2)}s`,
      speed: `${Math.round(tested / durationSec)} hashes/sec`
    },
    null,
    2
  ));
}

run().catch(err => {
  console.error(JSON.stringify(
    formatError("Unhandled error", "UNHANDLED_ERROR", err),
    null,
    2
  ));
  process.exit(1);
});
