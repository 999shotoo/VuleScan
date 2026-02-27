import { hashValue, SupportedAlgorithm } from "../hash/index.js";
import { resolveWordSource } from "../wordlist/resolveSource.js";
import { WordSource } from "../wordlist/types.js";
import type { ProxyManager, RequestOptions } from "../network/proxyManager.js";
import {
  BruteForceResult,
  BruteForceError,
  ProgressStats
} from "../types/result.js";

type Params = {
  hash: string;
  algorithm: SupportedAlgorithm;
  source: WordSource;
  concurrency?: number;
  timeout?: number;
  onProgress?: (stats: ProgressStats) => void;
  signal?: AbortSignal;
  requestOptions?: RequestOptions;
  proxyManager?: ProxyManager;
};

export async function bruteForce({
  hash,
  algorithm,
  source,
  concurrency = 4,
  timeout,
  onProgress,
  signal,
  requestOptions,
  proxyManager
}: Params): Promise<BruteForceResult | BruteForceError> {

  const expectedLen = algorithm === "md5" ? 32 : 64;
  if (!/^[a-f0-9]+$/i.test(hash) || hash.length !== expectedLen) {
    return {
      success: false,
      error: {
        code: "INVALID_HASH_FORMAT",
        message: `Hash must be ${expectedLen} hex characters`
      }
    };
  }

  let attempts = 0;
  let found: string | null = null;
  let aborted = false;
  const start = Date.now();

  const queue: string[] = [];
  let producing = true;

  const networkOptions: RequestOptions = {
    agent: requestOptions?.agent ?? proxyManager?.getAgentForRequest()
  };

  const producer = (async () => {
    for await (const word of resolveWordSource(source, networkOptions)) {
      if (aborted) break;
      queue.push(word);
      while (queue.length > 10_000) {
        await new Promise(r => setTimeout(r, 10));
      }
    }
    producing = false;
  })();

  const worker = async () => {
    while (!aborted && (producing || queue.length)) {
      if (signal?.aborted) aborted = true;
      const word = queue.pop();
      if (!word) {
        await new Promise(r => setTimeout(r, 5));
        continue;
      }

      attempts++;
      if (hashValue(word, algorithm) === hash) {
        found = word;
        aborted = true;
        break;
      }

      if (onProgress) {
        const elapsed = Math.max((Date.now() - start) / 1000, 0.001);
        onProgress({ tested: attempts, speed: Math.floor(attempts / elapsed) });
      }
    }
  };

  const workers = Array.from({ length: concurrency }, worker);

  let timeoutTimer: NodeJS.Timeout | undefined;
  if (timeout) timeoutTimer = setTimeout(() => aborted = true, timeout * 1000);

  await producer;
  await Promise.all(workers);
  if (timeoutTimer) clearTimeout(timeoutTimer);

  const durationSec = (Date.now() - start) / 1000;

  return {
    success: true,
    password: found,
    attempts,
    duration: `${durationSec.toFixed(2)}s`,
    speed: `${Math.round(attempts / durationSec)} hashes/sec`,
    algorithm,
    stoppedByUser: aborted && !found
  };
}
