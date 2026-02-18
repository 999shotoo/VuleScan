import { Algorithm } from "../types.js";


export function detectAlgorithm(value: string): Algorithm {
  if (/^\$2[aby]\$\d{2}\$/.test(value)) return "BCRYPT";
  if (/^[a-f0-9]{32}$/i.test(value)) return "MD5";
  if (/^[a-f0-9]{40}$/i.test(value)) return "SHA1";
  if (/^[a-f0-9]{56}$/i.test(value)) return "SHA224";
  if (/^[a-f0-9]{64}$/i.test(value)) return "SHA256";
  if (/^[a-f0-9]{96}$/i.test(value)) return "SHA384";
  if (/^[a-f0-9]{128}$/i.test(value)) return "SHA512";
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length % 4 === 0 && value.length >= 4) {
    try {
      const decoded = Buffer.from(value, "base64").toString("utf8");
      if (/^[\x20-\x7E\s]*$/.test(decoded) && decoded.length > 0) return "BASE64";
    } catch {}
  }
  if (/^[a-f0-9]+$/i.test(value) && value.length % 2 === 0 && value.length > 8) return "HEX";
  return "UNKNOWN";
}