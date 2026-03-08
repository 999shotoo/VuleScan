/**
 * Core utility functions
 */

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize URL
 */
export function normalizeUrl(url: string): string {
  // Add protocol if missing
  if (!url.includes("://")) {
    url = "https://" + url;
  }
  return url;
}

/**
 * Generate timestamp for reports
 */
export function generateTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
}

/**
 * Format JSON with proper indentation
 */
export function formatJSON(data: any): string {
  return JSON.stringify(data, null, 2);
}
