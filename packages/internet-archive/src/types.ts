/**
 * Type definitions for Internet Archive APIs and vulnerability scanning
 */

/**
 * CDX record fields available from the CDX API
 */
export interface CDXRecord {
  urlkey: string;
  timestamp: string;
  original: string;
  mimetype: string;
  statuscode: string;
  digest: string;
  length: string;
}

/**
 * CDX API Query parameters
 */
export interface CDXQueryParams {
  url: string;
  matchType?: 'exact' | 'prefix' | 'host' | 'domain';
  output?: 'json' | 'text';
  fl?: string;
  filter?: string | string[];
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  collapse?: string | string[];
  showResumeKey?: boolean;
  resumeKey?: string;
  showDupeCount?: boolean;
  showSkipCount?: boolean;
  lastSkipTimestamp?: boolean;
  page?: number;
  pageSize?: number;
  showNumPages?: boolean;
  gzip?: boolean;
  callback?: string;
  fastLatest?: boolean;
}

/**
 * CDX API Response
 */
export interface CDXResponse {
  headers: string[];
  records: (string | number)[][];
  resumeKey?: string;
  numPages?: number;
}

/**
 * Wayback Availability API Response
 */
export interface WaybackAvailabilityResponse {
  archived_snapshots: {
    closest?: {
      available: boolean;
      url: string;
      timestamp: string;
      status: string;
    };
  };
}

/**
 * Vulnerability finding from archived snapshot
 */
export interface VulnerabilityFinding {
  url: string;
  timestamp: string;
  archived_url: string;
  status_code: string;
  mimetype: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  finding_type: 'status_change' | 'exposed_endpoint' | 'configuration_change' | 'historical_data' | 'suspicious_content';
  description: string;
  evidence: Record<string, any>;
}

/**
 * Vulnerability scan result
 */
export interface ScanResult {
  target_url: string;
  scan_date: Date;
  total_captures: number;
  findings: VulnerabilityFinding[];
  risk_level: 'critical' | 'high' | 'medium' | 'low' | 'none';
  summary: {
    total_vulnerabilities: number;
    by_severity: Record<string, number>;
    by_type: Record<string, number>;
  };
}

/**
 * Configuration for the vulnerability scanner
 */
export interface ScannerConfig {
  timeout?: number;
  retries?: number;
  retry_delay?: number;
  enable_pagination?: boolean;
  max_results?: number;
  user_agent?: string;
  log_level?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Status code vulnerability indicator
 */
export interface StatusCodeIndicator {
  code: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
}

/**
 * HTTP response pattern that may indicate vulnerability
 */
export interface VulnerablePattern {
  name: string;
  patterns: RegExp[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}
