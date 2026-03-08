import { createHash } from "../core/hashing.js";
import { generateMutations } from "../core/mutations.js";
import { Algorithm } from "../types.js";


export const COMMON_PASSWORDS = [
  "password", "123456", "12345678", "password123", "admin", "letmein", "welcome",
  "monkey", "dragon", "master", "sunshine", "qwerty", "abc123", "111111", "123123",
  "welcome123", "login", "passw0rd", "password1", "root", "toor", "pass", "test",
  "guest", "admin123"
];

export function tryCommonPasswords(
  inputHash: string,
  algo: Algorithm,
  options: { mutations?: boolean }
): {
  cracked: boolean;
  value: string | null;
  method: string | null;
  attempts: number;
  timeElapsed: string;
} {
  const startTime = Date.now();
  let attempts = 0;

  const passwords = options.mutations
    ? COMMON_PASSWORDS.flatMap(p => generateMutations(p))
    : COMMON_PASSWORDS;

  for (const password of passwords) {
    attempts++;
    const hashedPassword = createHash(password, algo);
    if (hashedPassword === inputHash.toLowerCase()) {
      return {
        cracked: true,
        value: password,
        method: "COMMON_PASSWORD",
        attempts,
        timeElapsed: ((Date.now() - startTime) / 1000).toFixed(2) + "s"
      };
    }
  }

  return {
    cracked: false,
    value: null,
    method: null,
    attempts,
    timeElapsed: ((Date.now() - startTime) / 1000).toFixed(2) + "s"
  };
}