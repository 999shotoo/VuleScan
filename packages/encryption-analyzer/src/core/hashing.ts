import crypto from "crypto";
import { Algorithm } from "../types.js";


export function createHash(word: string, algo: Algorithm): string {
  if (algo === "NTLM") {
    return crypto.createHash("md4").update(Buffer.from(word, "utf16le")).digest("hex");
  }
  return crypto.createHash(algo.toLowerCase()).update(word).digest("hex");
}