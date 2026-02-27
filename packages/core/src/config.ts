/**
 * Configuration and environment settings
 */

export const CONFIG = {
  // Timeout settings (in milliseconds)
  SCAN_TIMEOUT: 30000,
  HTTP_TIMEOUT: 5000,

  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,

  // Concurrency settings
  MAX_CONCURRENT_SCANS: 3,

  // Report settings
  REPORT_DIR: "./scan-reports",
  REPORT_FORMAT: "json",

  // Logging
  DEBUG: process.env.DEBUG === "true",
  VERBOSE: process.env.VERBOSE === "true",

  // Proxy settings
  USE_PROXY: process.env.HTTP_PROXY || process.env.HTTPS_PROXY,

  // Performance
  ENABLE_CACHING: true,
  CACHE_TTL: 3600000, // 1 hour in milliseconds
};

export const SEVERITY_LEVELS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
} as const;

export const STATUS_CODES = {
  SUCCESS: 0,
  ERROR: 1,
  INVALID_INPUT: 2,
  TIMEOUT: 3,
} as const;
