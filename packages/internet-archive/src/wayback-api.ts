import logger from './logger.js';
import { WaybackAvailabilityResponse } from './types.js';

/**
 * Wayback Machine Availability API client
 * Checks if a URL is archived and provides access to snapshots
 */
export class WaybackAPI {
  private baseUrl: string = 'https://archive.org/wayback/available';
  private timeout: number;
  private headers: Record<string, string>;

  constructor(userAgent?: string) {
    this.timeout = 10000;
    this.headers = { 'User-Agent': userAgent || 'Mozilla/5.0 (Vulnerability Scanner)' };
  }

  /**
   * Check if a URL is available in the Wayback Machine
   * @param url - The URL to check
   * @param timestamp - Optional specific timestamp (YYYYMMDDhhmmss format)
   * @returns Availability response with closest snapshot info
   */
  async checkAvailability(url: string, timestamp?: string): Promise<WaybackAvailabilityResponse> {
    try {
      logger.debug('Checking Wayback availability', { url, timestamp });

      const params: Record<string, any> = { url };
      if (timestamp) {
        params.timestamp = timestamp;
      }

      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
      );
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);
      let res: globalThis.Response;
      try {
        res = await fetch(`${this.baseUrl}?${qs}`, { headers: this.headers, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as WaybackAvailabilityResponse;

      logger.debug('Wayback availability check successful', {
        url,
        available: !!data.archived_snapshots.closest,
      });

      return data;
    } catch (error) {
      logger.error('Error checking Wayback availability', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to check Wayback availability for ${url}`);
    }
  }

  /**
   * Get all available snapshots for a URL within a time range
   * @param url - The URL to search
   * @param fromDate - Start date (YYYYMMDDhhmmss)
   * @param toDate - End date (YYYYMMDDhhmmss)
   * @returns Availability response
   */
  async getSnapshotInRange(url: string, fromDate: string, toDate: string): Promise<WaybackAvailabilityResponse> {
    try {
      logger.debug('Getting snapshots in range', { url, fromDate, toDate });

      // Wayback API returns closest to a timestamp, so we get closest to fromDate
      const response = await this.checkAvailability(url, fromDate);

      return response;
    } catch (error) {
      logger.error('Error getting snapshots in range', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get the most recent snapshot of a URL
   * @param url - The URL to check
   * @returns Availability response with most recent snapshot
   */
  async getLatestSnapshot(url: string): Promise<WaybackAvailabilityResponse> {
    try {
      logger.debug('Getting latest snapshot', { url });
      return await this.checkAvailability(url);
    } catch (error) {
      logger.error('Error getting latest snapshot', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Construct archive URL from timestamp and original URL
   * @param timestamp - Snapshot timestamp (YYYYMMDDhhmmss)
   * @param originalUrl - Original URL
   * @returns Full archive URL
   */
  constructArchiveUrl(timestamp: string, originalUrl: string): string {
    return `https://web.archive.org/web/${timestamp}/${originalUrl}`;
  }
}

export default WaybackAPI;
