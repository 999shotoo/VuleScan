/**
 * Common types for the vulnerability scanner CLI
 */

export type ScanStatus = "safe" | "vulnerable";
export type SeverityLevel = "low" | "medium" | "high";

export interface ScanResult {
  name: string;
  status: ScanStatus;
  severity?: SeverityLevel;
  details?: string;
}

export interface DirectorySearchRunOptions {
  threads?: number;
  includeHidden?: boolean;
  hiddenEntries?: string[];
}

export interface NetworkScanRunOptions {
  hostDiscovery?: boolean;
  versionDetection?: boolean;
  osDetection?: boolean;
  networkMapping?: boolean;
  firewallDetection?: boolean;
  scriptEngine?: boolean;
  scanType?: "TCP_CONNECT" | "FAST_CONNECT" | "SERVICE_DETECT";
  scripts?: string[];
}

export interface BruteforceRunOptions {
  mode?: "hash" | "ssh" | "http" | "ftp" | "smtp" | "pop3" | "imap" | "telnet";
  attack?: "credential" | "password-spray" | "username-spray";
  threads?: number;
}

export interface SubdomainRunOptions {
  queryTypes?: string[];
  reverseLookup?: boolean;
  zoneTransferCheck?: boolean;
}

export interface ScanRunOptions {
  wordlistPath?: string;
  directorySearch?: DirectorySearchRunOptions;
  networkScan?: NetworkScanRunOptions;
  bruteforce?: BruteforceRunOptions;
  subdomain?: SubdomainRunOptions;
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
