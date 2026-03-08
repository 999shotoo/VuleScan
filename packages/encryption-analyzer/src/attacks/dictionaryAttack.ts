import fs from "fs";
import readline from "readline";
import { createHash } from "../core/hashing.js";
import { generateMutations } from "../core/mutations.js";
import { Algorithm } from "../types.js";

export async function dictionaryAttack(
  inputHash: string,
  algo: Algorithm,
  wordlistPath: string,
  options: { mutations?: boolean; verbose?: boolean }
): Promise<{
  cracked: boolean;
  value: string | null;
  method: string;
  attempts: number;
  timeElapsed: string;
}> {
  const startTime = Date.now();
  let attempts = 0;

  try {
    const fileStream = fs.createReadStream(wordlistPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      const word = line.trim();
      if (!word) continue;

      const words = options.mutations ? generateMutations(word) : [word];
      for (const testWord of words) {
        attempts++;
        const hashedWord = createHash(testWord, algo);

        if (hashedWord === inputHash.toLowerCase()) {
          return {
            cracked: true,
            value: testWord,
            method: "WORDLIST_ATTACK",
            attempts,
            timeElapsed: ((Date.now() - startTime)/1000).toFixed(2) + "s"
          };
        }
      }
    }

    return {
      cracked: false,
      value: null,
      method: "WORDLIST_ATTACK_FAILED",
      attempts,
      timeElapsed: ((Date.now() - startTime)/1000).toFixed(2) + "s"
    };
  } catch (err) {
    return {
      cracked: false,
      value: null,
      method: "WORDLIST_READ_ERROR",
      attempts,
      timeElapsed: ((Date.now() - startTime)/1000).toFixed(2) + "s"
    };
  }
}