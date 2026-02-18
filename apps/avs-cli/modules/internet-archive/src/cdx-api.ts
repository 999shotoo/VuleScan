import axios, { AxiosInstance } from 'axios';
import logger from './logger.js';
import { CDXQueryParams, CDXResponse, CDXRecord } from './types.js';

/**
 * CDX Server API client
 * Provides advanced search and filtering capabilities for Wayback Machine captures
 */
export class CDXAPI {
  private client: AxiosInstance;
  private baseUrl: string = 'https://web.archive.org/cdx/search/cdx';

  constructor(userAgent?: string) {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': userAgent || 'Mozilla/5.0 (Vulnerability Scanner)',
      },
    });
  }

  /**
   * Execute a CDX query
   * @param params - CDX query parameters
   * @returns CDX response with records
   */
  async query(params: CDXQueryParams): Promise<CDXResponse> {
    try {
      logger.debug('Executing CDX query', { url: params.url, matchType: params.matchType });

      // Build query parameters
      const queryParams = this.buildQueryParams(params);

      const response = await this.client.get<string | (string | number)[][]>(this.baseUrl, {
        params: queryParams,
        responseType: params.output === 'json' ? 'json' : 'text',
      });

      if (params.output === 'json') {
        return this.parseJSONResponse(response.data as (string | number)[][]);
      } else {
        return this.parseTextResponse(response.data as string);
      }
    } catch (error) {
      logger.error('Error executing CDX query', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to execute CDX query');
    }
  }

  /**
   * Search for all captures of a URL
   * @param url - URL to search
   * @param limit - Maximum number of results
   * @returns CDX records
   */
  async searchURL(url: string, limit: number = 10000): Promise<CDXRecord[]> {
    try {
      logger.info('Searching CDX for URL', { url, limit });

      const response = await this.query({
        url,
        output: 'json',
        limit,
        gzip: false,
      });

      const records = this.convertToRecords(response);
      logger.info('CDX search completed', { url, total_records: records.length });

      return records;
    } catch (error) {
      logger.error('Error searching CDX', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Search for URLs matching a prefix
   * @param url - URL prefix to search
   * @param limit - Maximum number of results
   * @returns CDX records
   */
  async searchPrefix(url: string, limit: number = 10000): Promise<CDXRecord[]> {
    try {
      logger.info('Searching CDX with prefix', { url, limit });

      const response = await this.query({
        url,
        matchType: 'prefix',
        output: 'json',
        limit,
        gzip: false,
      });

      const records = this.convertToRecords(response);
      logger.info('CDX prefix search completed', { url, total_records: records.length });

      return records;
    } catch (error) {
      logger.error('Error searching CDX prefix', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Search for all subdomains of a domain
   * @param domain - Domain to search
   * @param limit - Maximum number of results
   * @returns CDX records
   */
  async searchDomain(domain: string, limit: number = 10000): Promise<CDXRecord[]> {
    try {
      logger.info('Searching CDX for domain', { domain, limit });

      const response = await this.query({
        url: domain,
        matchType: 'domain',
        output: 'json',
        limit,
        gzip: false,
      });

      const records = this.convertToRecords(response);
      logger.info('CDX domain search completed', { domain, total_records: records.length });

      return records;
    } catch (error) {
      logger.error('Error searching CDX domain', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Search for specific status codes
   * @param url - URL to search
   * @param statusCode - HTTP status code to filter by
   * @param limit - Maximum number of results
   * @returns CDX records
   */
  async searchByStatusCode(url: string, statusCode: string, limit: number = 10000): Promise<CDXRecord[]> {
    try {
      logger.debug('Searching CDX by status code', { url, statusCode, limit });

      const response = await this.query({
        url,
        output: 'json',
        limit,
        filter: `statuscode:${statusCode}`,
        gzip: false,
      });

      const records = this.convertToRecords(response);
      logger.debug('Status code search completed', { url, statusCode, total_records: records.length });

      return records;
    } catch (error) {
      logger.error('Error searching by status code', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Search captures within a date range
   * @param url - URL to search
   * @param fromDate - Start date (format: YYYYMMDD or YYYYMMDDhhmmss)
   * @param toDate - End date (format: YYYYMMDD or YYYYMMDDhhmmss)
   * @param limit - Maximum number of results
   * @returns CDX records
   */
  async searchDateRange(url: string, fromDate: string, toDate: string, limit: number = 10000): Promise<CDXRecord[]> {
    try {
      logger.debug('Searching CDX by date range', { url, fromDate, toDate, limit });

      const response = await this.query({
        url,
        output: 'json',
        from: fromDate,
        to: toDate,
        limit,
        gzip: false,
      });

      const records = this.convertToRecords(response);
      logger.debug('Date range search completed', { url, total_records: records.length });

      return records;
    } catch (error) {
      logger.error('Error searching by date range', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get unique captures (remove duplicates by digest)
   * @param url - URL to search
   * @param limit - Maximum number of results
   * @returns CDX records
   */
  async searchUnique(url: string, limit: number = 10000): Promise<CDXRecord[]> {
    try {
      logger.debug('Searching CDX for unique captures', { url, limit });

      const response = await this.query({
        url,
        output: 'json',
        collapse: 'digest',
        limit,
        gzip: false,
      });

      const records = this.convertToRecords(response);
      logger.debug('Unique search completed', { url, total_records: records.length });

      return records;
    } catch (error) {
      logger.error('Error searching for unique captures', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get number of pages for a query (for pagination)
   * @param params - CDX query parameters
   * @returns Number of pages
   */
  async getNumPages(params: CDXQueryParams): Promise<number> {
    try {
      logger.debug('Getting number of pages', { url: params.url });

      const response = await this.client.get<string>(this.baseUrl, {
        params: {
          ...this.buildQueryParams(params),
          showNumPages: 'true',
        },
      });

      const numPages = parseInt(response.data as string, 10);
      logger.debug('Got number of pages', { numPages });

      return numPages;
    } catch (error) {
      logger.error('Error getting number of pages', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get specific page of results (pagination)
   * @param params - CDX query parameters
   * @param pageNum - Page number to retrieve
   * @returns CDX records for the page
   */
  async getPage(params: CDXQueryParams, pageNum: number): Promise<CDXRecord[]> {
    try {
      logger.debug('Getting CDX page', { url: params.url, pageNum });

      const response = await this.query({
        ...params,
        page: pageNum,
        output: 'json',
        gzip: false,
      });

      const records = this.convertToRecords(response);
      logger.debug('Got CDX page', { pageNum, total_records: records.length });

      return records;
    } catch (error) {
      logger.error('Error getting CDX page', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Build CDX query parameters from options
   * @param params - Query parameters
   * @returns Formatted query parameters
   */
  private buildQueryParams(params: CDXQueryParams): Record<string, any> {
    const query: Record<string, any> = { url: params.url };

    if (params.matchType) query.matchType = params.matchType;
    if (params.output) query.output = params.output;
    if (params.fl) query.fl = params.fl;
    if (params.filter) query.filter = params.filter;
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
    if (params.limit) query.limit = params.limit;
    if (params.offset) query.offset = params.offset;
    if (params.collapse) query.collapse = params.collapse;
    if (params.showResumeKey) query.showResumeKey = 'true';
    if (params.resumeKey) query.resumeKey = params.resumeKey;
    if (params.showDupeCount) query.showDupeCount = 'true';
    if (params.showSkipCount) query.showSkipCount = 'true';
    if (params.lastSkipTimestamp) query.lastSkipTimestamp = 'true';
    if (params.page !== undefined) query.page = params.page;
    if (params.pageSize) query.pageSize = params.pageSize;
    if (params.showNumPages) query.showNumPages = 'true';
    if (params.gzip !== undefined) query.gzip = params.gzip ? 'true' : 'false';
    if (params.callback) query.callback = params.callback;
    if (params.fastLatest) query.fastLatest = 'true';

    return query;
  }

  /**
   * Parse JSON response from CDX API
   * @param data - Raw JSON data
   * @returns Parsed CDX response
   */
  private parseJSONResponse(data: (string | number)[][]): CDXResponse {
    if (!Array.isArray(data) || data.length === 0) {
      return { headers: [], records: [] };
    }

    const headers = data[0] as string[];
    const records = data.slice(1);

    return { headers, records };
  }

  /**
   * Parse text response from CDX API
   * @param data - Raw text data
   * @returns Parsed CDX response
   */
  private parseTextResponse(data: string): CDXResponse {
    const lines = data.trim().split('\n');

    if (lines.length === 0) {
      return { headers: [], records: [] };
    }

    const records = lines.map((line) => line.split(' '));

    return { headers: [], records };
  }

  /**
   * Convert CDX response to typed records
   * @param response - CDX response
   * @returns Array of CDX records
   */
  private convertToRecords(response: CDXResponse): CDXRecord[] {
    return response.records
      .filter((record) => record.length >= 7)
      .map((record) => ({
        urlkey: String(record[0]),
        timestamp: String(record[1]),
        original: String(record[2]),
        mimetype: String(record[3]),
        statuscode: String(record[4]),
        digest: String(record[5]),
        length: String(record[6]),
      }));
  }
}

export default CDXAPI;
