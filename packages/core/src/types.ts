/**
 * Core types shared across all scanner packages
 */

export type ScanStatus = "safe" | "vulnerable";
export type SeverityLevel = "low" | "medium" | "high";

export interface ScanResult {
  name: string;
  status: ScanStatus;
  severity?: SeverityLevel;
  details?: string;
}

export interface ScanRunOptions {
  wordlistPath?: string;
}

export interface ScanModule {
  name: string;
  description: string;
  scan: (targetUrl: string, options?: ScanRunOptions) => Promise<ScanResult>;
}

export interface CLIOptions {
  targetUrl: string;
  all?: boolean;
  json?: string;
  wordlist?: string;
}

export interface ScanReport {
  timestamp: string;
  targetUrl: string;
  scans: ScanResult[];
  summary: {
    total: number;
    vulnerable: number;
    safe: number;
  };
}
