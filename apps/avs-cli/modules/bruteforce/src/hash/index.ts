import { md5Hash } from "./md5.js";
import { sha256Hash } from "./sha256.js";

export type SupportedAlgorithm = "md5" | "sha256";

export function hashValue(value: string, algo: SupportedAlgorithm): string {
  if (algo === "md5") return md5Hash(value);
  if (algo === "sha256") return sha256Hash(value);
  throw new Error(`Unsupported hash algorithm: ${algo}`);
}
