import { BaseService, type Credentials } from "../services/index.js";
import { resolveWordSource } from "../wordlist/resolveSource.js";
import { WordSource } from "../wordlist/types.js";
import type { RequestOptions } from "../network/proxyManager.js";
import os from "node:os";

export interface ProgressStats {
  tested: number;
  speed: number;
  found?: boolean;
  foundCredentials?: Credentials;
}

export interface BruteForceResult {
  success: boolean;
  credentials?: Credentials;
  attempts: number;
  duration: number;
  speed: number;
  attackMode?: AttackMode;
  platform?: NodeJS.Platform;
}

export interface BruteForceError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type AttackMode = "credential" | "password-spray" | "username-spray";

type Params = {
  service: BaseService;
  usernames: WordSource;
  passwords: WordSource;
  concurrency?: number;
  onProgress?: (stats: ProgressStats) => void;
  signal?: AbortSignal;
  requestOptions?: RequestOptions;
  attackMode?: AttackMode;
};

export async function bruteForceCredentials({
  service,
  usernames,
  passwords,
  concurrency = 4,
  onProgress,
  signal,
  requestOptions,
  attackMode = "credential"
}: Params): Promise<BruteForceResult | BruteForceError> {
  let attempts = 0;
  let found: Credentials | null = null;
  let aborted = false;
  const start = Date.now();

  const credQueue: Credentials[] = [];
  let producing = true;

  // Producer: generate credentials from username and password lists
  const producer = (async () => {
    try {
      const usernames_list: string[] = [];
      for await (const username of resolveWordSource(usernames, requestOptions)) {
        usernames_list.push(username);
      }

      const passwordList: string[] = [];
      for await (const password of resolveWordSource(passwords, requestOptions)) {
        passwordList.push(password);
      }

      if (attackMode === "password-spray") {
        for (const password of passwordList) {
          if (aborted) break;
          for (const username of usernames_list) {
            if (aborted) break;
            credQueue.push({ username, password });
            while (credQueue.length > 10_000) {
              await new Promise((r) => setTimeout(r, 10));
            }
          }
        }
      } else if (attackMode === "username-spray") {
        for (const username of usernames_list) {
          if (aborted) break;
          for (const password of passwordList) {
            if (aborted) break;
            credQueue.push({ username, password });
            while (credQueue.length > 10_000) {
              await new Promise((r) => setTimeout(r, 10));
            }
          }
        }
      } else {
        for (const password of passwordList) {
          if (aborted) break;
          for (const username of usernames_list) {
            if (aborted) break;
            credQueue.push({ username, password });
            while (credQueue.length > 10_000) {
              await new Promise((r) => setTimeout(r, 10));
            }
          }
        }
      }
    } finally {
      producing = false;
    }
  })();

  // Worker: test credentials
  const worker = async () => {
    while (!aborted && (producing || credQueue.length)) {
      if (signal?.aborted) aborted = true;

      const cred = credQueue.pop();
      if (!cred) {
        await new Promise((r) => setTimeout(r, 5));
        continue;
      }

      attempts++;

      try {
        if (await service.test(cred)) {
          found = cred;
          aborted = true;

          if (onProgress) {
            const elapsed = Math.max((Date.now() - start) / 1000, 0.001);
            onProgress({
              tested: attempts,
              speed: Math.floor(attempts / elapsed),
              found: true,
              foundCredentials: cred
            });
          }
          break;
        }
      } catch {
        // Continue on error
      }

      if (onProgress && attempts % 10 === 0) {
        const elapsed = Math.max((Date.now() - start) / 1000, 0.001);
        onProgress({
          tested: attempts,
          speed: Math.floor(attempts / elapsed)
        });
      }
    }
  };

  const workers = Array.from({ length: concurrency }, worker);

  await producer;
  await Promise.all(workers);

  const duration = (Date.now() - start) / 1000;
  const speed = attempts / Math.max(duration, 0.001);

  if (found) {
    return {
      success: true,
      credentials: found,
      attempts,
      duration,
      speed,
      attackMode,
      platform: os.platform()
    };
  }

  return {
    success: false,
    error: {
      code: "NO_MATCH",
      message: "No valid credentials found"
    }
  };
}
