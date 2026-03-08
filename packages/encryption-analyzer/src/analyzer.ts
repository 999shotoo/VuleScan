import { Algorithm, AnalyzerOptions, AnalyzerResult } from "./types.js";
import { buildRequestOptions, ProxyManager } from "./network/proxyManager.js";
import { detectAlgorithm } from "./core/algorithmDetection.js";
import { getAlgorithmDetails } from "./analysis/algorithmInfo.js";
import { tryCommonPasswords } from "./attacks/commonPasswordAttack.js";
import { dictionaryAttack } from "./attacks/dictionaryAttack.js";

export async function analyzeEncryption(
  input: string,
  options: AnalyzerOptions = {}
): Promise<AnalyzerResult> {
  const proxyManager = options.proxy ? new ProxyManager(options.proxy) : undefined;
  const normalizedOptions: AnalyzerOptions = proxyManager
    ? {
        ...options,
        requestOptions: buildRequestOptions(
          proxyManager,
          undefined,
          options.requestOptions ?? {}
        )
      }
    : options;

  if (!input) {
    return {
      success: false,
      analysis: {
        input: "",
        algorithm: "UNKNOWN",
        type: "UNKNOWN",
        reversible: false,
        strength: "UNKNOWN",
        risk: "UNKNOWN",
        details: "Input cannot be empty"
      },
      result: {
        cracked: false,
        value: null,
        method: null
      },
      error: "Input string empty"
    };
  }

  const algorithm = detectAlgorithm(input);
  const algorithmInfo = getAlgorithmDetails(algorithm);
  const analysis = {
    input,
    algorithm,
    ...algorithmInfo
  };

  let result: AnalyzerResult["result"] = {
    cracked: false,
    value: null,
    method: null
  };

  if (algorithm === "BASE64") {
    try {
      result = {
        cracked: true,
        value: Buffer.from(input, "base64").toString("utf8"),
        method: "BASE64_DECODE"
      };
    } catch {
      result.method = "BASE64_DECODE_FAILED";
    }
  } else if (algorithm === "HEX") {
    try {
      const decoded = Buffer.from(input, "hex").toString("utf8");
      if (/^[\x20-\x7E\s]*$/.test(decoded)) {
        result = {
          cracked: true,
          value: decoded,
          method: "HEX_DECODE"
        };
      } else {
        result.method = "HEX_DECODE_NOT_TEXT";
      }
    } catch {
      result.method = "HEX_DECODE_FAILED";
    }
  } else if (algorithm === "BCRYPT") {
    result.method = "BCRYPT_NOT_CRACKABLE";
  } else if (
    ["MD5", "SHA1", "SHA224", "SHA256", "SHA384", "SHA512", "NTLM"].includes(algorithm)
  ) {
    result = tryCommonPasswords(input, algorithm, normalizedOptions);
    if (!result.cracked && !normalizedOptions.quick && normalizedOptions.wordlistPath) {
      result = await dictionaryAttack(
        input,
        algorithm,
        normalizedOptions.wordlistPath,
        normalizedOptions
      );
    }
  }

  return {
    success: true,
    analysis,
    result
  };
}
