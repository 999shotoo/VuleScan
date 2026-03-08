import type { Algorithm } from "../types.js";

export type AlgorithmDetails = {
  type: "HASH" | "ENCODING" | "UNKNOWN";
  reversible: boolean;
  strength: "WEAK" | "MEDIUM" | "STRONG" | "VERY_STRONG" | "UNKNOWN";
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";
  details: string;
};

const ALGORITHM_DETAILS: Record<Algorithm, AlgorithmDetails> = {
  MD5: {
    type: "HASH",
    reversible: false,
    strength: "WEAK",
    risk: "CRITICAL",
    details:
      "MD5 is cryptographically broken and vulnerable to collision attacks."
  },

  SHA1: {
    type: "HASH",
    reversible: false,
    strength: "WEAK",
    risk: "HIGH",
    details:
      "SHA1 is deprecated due to practical collision attacks."
  },

  SHA224: {
    type: "HASH",
    reversible: false,
    strength: "MEDIUM",
    risk: "MEDIUM",
    details:
      "SHA224 is a truncated SHA-256 variant, adequate but not preferred."
  },

  SHA256: {
    type: "HASH",
    reversible: false,
    strength: "STRONG",
    risk: "MEDIUM",
    details:
      "SHA256 is secure but requires salting to resist brute-force attacks."
  },

  SHA384: {
    type: "HASH",
    reversible: false,
    strength: "STRONG",
    risk: "LOW",
    details:
      "SHA384 provides strong cryptographic security."
  },

  SHA512: {
    type: "HASH",
    reversible: false,
    strength: "VERY_STRONG",
    risk: "LOW",
    details:
      "SHA512 is recommended for high-security use cases."
  },

  NTLM: {
    type: "HASH",
    reversible: false,
    strength: "WEAK",
    risk: "CRITICAL",
    details:
      "NTLM is MD4-based and extremely weak. Deprecated."
  },

  BASE64: {
    type: "ENCODING",
    reversible: true,
    strength: "WEAK",
    risk: "CRITICAL",
    details:
      "Base64 is encoding, not encryption. Trivially reversible."
  },

  HEX: {
    type: "ENCODING",
    reversible: true,
    strength: "WEAK",
    risk: "CRITICAL",
    details:
      "Hex encoding provides no security."
  },

  BCRYPT: {
    type: "HASH",
    reversible: false,
    strength: "VERY_STRONG",
    risk: "LOW",
    details:
      "Bcrypt is designed for password hashing with built-in salting."
  },

  UNKNOWN: {
    type: "UNKNOWN",
    reversible: false,
    strength: "UNKNOWN",
    risk: "UNKNOWN",
    details:
      "Unable to determine algorithm type."
  }
};

export function getAlgorithmDetails(algo: Algorithm): AlgorithmDetails {
  return ALGORITHM_DETAILS[algo] ?? ALGORITHM_DETAILS.UNKNOWN;
}
