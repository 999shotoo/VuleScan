/**
 * Utility functions and constants for vulnerability scanning
 */

import { VulnerablePattern, StatusCodeIndicator, VulnerabilityFinding } from './types.js';

/**
 * Common vulnerable URLs and patterns
 */
export const COMMON_VULNERABLE_ENDPOINTS = {
  admin: ['/admin', '/administrator', '/admin.php', '/admin.html', '/webadmin'],
  wordpress: ['/wp-admin', '/wp-login', '/wp-content', '/wp-includes'],
  cms: ['/administrator', '/admin/login', '/cms', '/content-manager'],
  database: ['/phpmyadmin', '/mysql', '/pgadmin', '/mssql', '/mongodb'],
  config: [
    '/.env',
    '/.env.local',
    '/.env.production',
    '/config.php',
    '/config.js',
    '/settings.ini',
    '/database.yml',
    '/secrets.yaml',
  ],
  git: ['/.git', '/.git/config', '/.gitignore', '/.github'],
  aws: ['/.aws', '/.aws/credentials', '/.aws/config'],
  backup: ['/backup', '/backup.sql', '/backup.zip', '/dump', '/export'],
  debug: ['/debug', '/debugbar', '/dev', '/dev-tools', '/test', '/testing', '/staging'],
  api: ['/api', '/api/v1', '/api/admin', '/api/debug', '/api/internal'],
  other: ['/shell.php', '/shell.asp', '/webshell', '/rshell', '/hack.php'],
};

/**
 * HTTP status codes with security implications
 */
export const SECURITY_RELEVANT_STATUS_CODES: StatusCodeIndicator[] = [
  {
    code: '200',
    severity: 'info',
    description: 'OK - Content accessible',
  },
  {
    code: '301',
    severity: 'low',
    description: 'Moved Permanently - Redirect detected',
  },
  {
    code: '302',
    severity: 'low',
    description: 'Found - Temporary redirect',
  },
  {
    code: '304',
    severity: 'info',
    description: 'Not Modified - Caching issue',
  },
  {
    code: '400',
    severity: 'low',
    description: 'Bad Request - Malformed request',
  },
  {
    code: '401',
    severity: 'high',
    description: 'Unauthorized - Authentication bypass possibility',
  },
  {
    code: '403',
    severity: 'medium',
    description: 'Forbidden - Access control misconfiguration',
  },
  {
    code: '404',
    severity: 'info',
    description: 'Not Found - Endpoint removed or never existed',
  },
  {
    code: '410',
    severity: 'low',
    description: 'Gone - Content permanently removed',
  },
  {
    code: '500',
    severity: 'critical',
    description: 'Internal Server Error - May expose sensitive information',
  },
  {
    code: '501',
    severity: 'medium',
    description: 'Not Implemented - Unfinished implementation',
  },
  {
    code: '502',
    severity: 'high',
    description: 'Bad Gateway - Service disruption',
  },
  {
    code: '503',
    severity: 'medium',
    description: 'Service Unavailable - Denial of Service',
  },
  {
    code: '504',
    severity: 'medium',
    description: 'Gateway Timeout - Service unavailable',
  },
];

/**
 * MIME types that might indicate sensitive content
 */
export const SENSITIVE_MIME_TYPES = [
  'application/json',
  'application/xml',
  'text/plain',
  'application/x-yaml',
  'application/x-www-form-urlencoded',
];

/**
 * Keywords that might indicate sensitive data in URLs
 */
export const SENSITIVE_KEYWORDS = [
  'password',
  'secret',
  'key',
  'token',
  'api',
  'private',
  'internal',
  'debug',
  'test',
  'admin',
  'backup',
  'database',
  'config',
  'credentials',
  'apikey',
  'accesskey',
];

/**
 * Patterns indicating information disclosure
 */
export const INFORMATION_DISCLOSURE_PATTERNS: VulnerablePattern[] = [
  {
    name: 'Error Pages',
    patterns: [/error|exception|stacktrace|traceback|debug/i],
    severity: 'high',
    description: 'Error page that may contain sensitive information',
  },
  {
    name: 'Version Disclosure',
    patterns: [/version|v\d+\.\d+|release|build/i],
    severity: 'medium',
    description: 'Software version information disclosed',
  },
  {
    name: 'Path Disclosure',
    patterns: [/home\/|\/var\/www|c:\\.*users|\/opt\/|\/srv\//i],
    severity: 'medium',
    description: 'File system path disclosed',
  },
  {
    name: 'Database Errors',
    patterns: [/mysql|postgres|oracle|sql|jdbc|pdo/i],
    severity: 'high',
    description: 'Database error information disclosed',
  },
];

/**
 * Filter findings by severity
 * @param findings - Array of findings
 * @param severity - Minimum severity level
 * @returns Filtered findings
 */
export function filterBySeverity(
  findings: VulnerabilityFinding[],
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info',
): VulnerabilityFinding[] {
  const severityLevels = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
  const minLevel = severityLevels[severity];

  return findings.filter((f) => severityLevels[f.severity] >= minLevel);
}

/**
 * Filter findings by type
 * @param findings - Array of findings
 * @param type - Finding type to filter by
 * @returns Filtered findings
 */
export function filterByType(
  findings: VulnerabilityFinding[],
  type: 'status_change' | 'exposed_endpoint' | 'configuration_change' | 'historical_data' | 'suspicious_content',
): VulnerabilityFinding[] {
  return findings.filter((f) => f.finding_type === type);
}

/**
 * Group findings by severity
 * @param findings - Array of findings
 * @returns Grouped findings
 */
export function groupBySeverity(
  findings: VulnerabilityFinding[],
): Record<string, VulnerabilityFinding[]> {
  return findings.reduce(
    (acc, finding) => {
      if (!acc[finding.severity]) {
        acc[finding.severity] = [];
      }
      acc[finding.severity].push(finding);
      return acc;
    },
    {} as Record<string, VulnerabilityFinding[]>,
  );
}

/**
 * Group findings by type
 * @param findings - Array of findings
 * @returns Grouped findings
 */
export function groupByType(findings: VulnerabilityFinding[]): Record<string, VulnerabilityFinding[]> {
  return findings.reduce(
    (acc, finding) => {
      if (!acc[finding.finding_type]) {
        acc[finding.finding_type] = [];
      }
      acc[finding.finding_type].push(finding);
      return acc;
    },
    {} as Record<string, VulnerabilityFinding[]>,
  );
}

/**
 * Sort findings by severity (critical first)
 * @param findings - Array of findings
 * @returns Sorted findings
 */
export function sortBySeverity(findings: VulnerabilityFinding[]): VulnerabilityFinding[] {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  return findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * Sort findings by timestamp (newest first)
 * @param findings - Array of findings
 * @returns Sorted findings
 */
export function sortByTimestamp(findings: VulnerabilityFinding[]): VulnerabilityFinding[] {
  return findings.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/**
 * Get top N findings
 * @param findings - Array of findings
 * @param n - Number of top findings to return
 * @returns Top N findings
 */
export function getTopFindings(findings: VulnerabilityFinding[], n: number = 10): VulnerabilityFinding[] {
  return sortBySeverity(findings).slice(0, n);
}

/**
 * Check if a URL matches any vulnerable pattern
 * @param url - URL to check
 * @param patterns - Patterns to check against
 * @returns Matching patterns
 */
export function matchVulnerablePattern(url: string, patterns: VulnerablePattern[] = []): VulnerablePattern[] {
  return patterns.filter((pattern) => pattern.patterns.some((regex) => regex.test(url)));
}

/**
 * Deduplicate findings based on URL
 * @param findings - Array of findings
 * @returns Deduplicated findings
 */
export function deduplicateFindings(findings: VulnerabilityFinding[]): VulnerabilityFinding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.url}:${f.finding_type}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Format timestamp to human-readable date
 * @param timestamp - Timestamp in format YYYYMMDDhhmmss
 * @returns Formatted date string
 */
export function formatTimestamp(timestamp: string): string {
  try {
    const year = parseInt(timestamp.substring(0, 4));
    const month = parseInt(timestamp.substring(4, 6));
    const day = parseInt(timestamp.substring(6, 8));
    const hour = parseInt(timestamp.substring(8, 10));
    const minute = parseInt(timestamp.substring(10, 12));
    const second = parseInt(timestamp.substring(12, 14));

    const date = new Date(year, month - 1, day, hour, minute, second);
    return date.toISOString();
  } catch {
    return timestamp;
  }
}

/**
 * Generate a summary report of findings
 * @param findings - Array of findings
 * @returns Summary report
 */
export function generateSummaryReport(findings: VulnerabilityFinding[]): Record<string, any> {
  const bySeverity = groupBySeverity(findings);
  const byType = groupByType(findings);

  return {
    total_findings: findings.length,
    by_severity: Object.fromEntries(
      Object.entries(bySeverity).map(([key, values]) => [key, values.length]),
    ),
    by_type: Object.fromEntries(
      Object.entries(byType).map(([key, values]) => [key, values.length]),
    ),
    top_severity_finding: findings.length > 0 ? findings[0].severity : 'none',
    most_common_type: findings.length > 0 ? findMostCommonType(findings) : 'none',
    time_span: findings.length > 0 ? {
      earliest: sortByTimestamp(findings)[findings.length - 1].timestamp,
      latest: sortByTimestamp(findings)[0].timestamp,
    } : null,
  };
}

/**
 * Find most common finding type
 * @param findings - Array of findings
 * @returns Most common type
 */
function findMostCommonType(findings: VulnerabilityFinding[]): string {
  const typeCount = findings.reduce(
    (acc, f) => {
      acc[f.finding_type] = (acc[f.finding_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return Object.entries(typeCount).sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown';
}

export default {
  COMMON_VULNERABLE_ENDPOINTS,
  SECURITY_RELEVANT_STATUS_CODES,
  SENSITIVE_MIME_TYPES,
  SENSITIVE_KEYWORDS,
  INFORMATION_DISCLOSURE_PATTERNS,
  filterBySeverity,
  filterByType,
  groupBySeverity,
  groupByType,
  sortBySeverity,
  sortByTimestamp,
  getTopFindings,
  matchVulnerablePattern,
  deduplicateFindings,
  formatTimestamp,
  generateSummaryReport,
};
