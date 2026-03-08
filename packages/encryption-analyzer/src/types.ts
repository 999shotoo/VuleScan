export type Algorithm =
  | "MD5"
  | "SHA1"
  | "SHA224"
  | "SHA256"
  | "SHA384"
  | "SHA512"
  | "NTLM"
  | "BASE64"
  | "HEX"
  | "BCRYPT"
  | "UNKNOWN";

export interface AnalyzerOptions {
  mutations?: boolean;
  verbose?: boolean;
  quick?: boolean;
  wordlistPath?: string;
  proxy?: ProxyConfig;
  requestOptions?: EngineRequestOptions;
}

export type EngineRequestOptions = {
  agent?: import("node:http").Agent | import("node:https").Agent;
};

export type ProxyMode = "none" | "single" | "list";

export type ProxyProtocol = "http" | "https" | "socks5";

export type ProxyRotateStrategy = "round-robin" | "random";

export type ProxySingleConfig =
  | {
      mode: "single";
      url: string;
    }
  | {
      mode: "single";
      host: string;
      port: number;
      protocol?: ProxyProtocol;
      username?: string;
      password?: string;
    };

export type ProxyListConfig = {
  mode: "list";
  file: string;
  rotate?: ProxyRotateStrategy;
};

export type ProxyNoneConfig = {
  mode: "none";
};

export type ProxyConfig = ProxyNoneConfig | ProxySingleConfig | ProxyListConfig;

export interface AnalyzerResult {
  success: boolean;
  analysis: {
    input: string;
    algorithm: Algorithm;
    type: "HASH" | "ENCODING" | "UNKNOWN";
    reversible: boolean;
    strength:
      | "WEAK"
      | "MEDIUM"
      | "STRONG"
      | "VERY_STRONG"
      | "UNKNOWN";
    risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";
    details: string;
  };
  result: {
    cracked: boolean;
    value: string | null;
    method: string | null;
    attempts?: number;
    timeElapsed?: string;
  };
  error?: string;
}