# Internet Archive Vulnerability Scanner

A comprehensive TypeScript module for vulnerability scanning using the Wayback Machine API and CDX Server. This module allows you to discover historical vulnerabilities, exposed endpoints, and security issues by analyzing archived snapshots of websites.

## Features

- **Wayback Machine Integration**: Query the Internet Archive's Wayback Machine for historical snapshots
- **CDX API Support**: Advanced search and filtering using the CDX Server API
- **Vulnerability Detection**:
  - Critical HTTP status codes (401, 403, 500, 502, 503)
  - Exposed administrative endpoints (admin, wp-admin, phpmyadmin)
  - Exposed configuration files (.env, .config, config.php)
  - Debug and testing pages
  - Content changes and anomalies
- **Historical Analysis**: Track changes over time, identify suspicious patterns
- **Subdomain Search**: Scan entire domains and all subdomains
- **Date Range Filtering**: Analyze specific time periods
- **Comprehensive Reporting**: Detailed findings with severity levels and evidence

## Installation

```bash
npm install @vulnerability-scanner/internet-archive
```

## Quick Start

```typescript
import { InternetArchiveVulnerabilityScanner } from '@vulnerability-scanner/internet-archive';

const scanner = new InternetArchiveVulnerabilityScanner({
  timeout: 30000,
  max_results: 10000,
  log_level: 'info'
});

// Scan a URL
const result = await scanner.scan('example.com', {
  checkCriticalStatusCodes: true,
  checkExposedEndpoints: true,
  checkContentChanges: true
});

console.log(`Found ${result.summary.total_vulnerabilities} vulnerabilities`);
console.log(`Risk Level: ${result.risk_level}`);
```

## API Reference

### InternetArchiveVulnerabilityScanner

#### Constructor

```typescript
new InternetArchiveVulnerabilityScanner(config?: ScannerConfig)
```

**Configuration Options:**
- `timeout`: Request timeout in milliseconds (default: 30000)
- `retries`: Number of retries for failed requests (default: 3)
- `retry_delay`: Delay between retries in milliseconds (default: 1000)
- `enable_pagination`: Enable pagination for large result sets (default: false)
- `max_results`: Maximum results per query (default: 10000)
- `user_agent`: Custom User-Agent header (default: 'Mozilla/5.0 (Vulnerability Scanner)')
- `log_level`: Logging level - 'debug' | 'info' | 'warn' | 'error' (default: 'info')

### Methods

#### `scan(targetUrl, options?)`

Perform a comprehensive vulnerability scan of a URL.

```typescript
const result = await scanner.scan('example.com', {
  fromDate: '20200101',
  toDate: '20231231',
  checkCriticalStatusCodes: true,
  checkExposedEndpoints: true,
  checkContentChanges: true
});
```

**Parameters:**
- `targetUrl`: URL to scan
- `options`:
  - `fromDate`: Start date (YYYYMMDD or YYYYMMDDhhmmss)
  - `toDate`: End date (YYYYMMDD or YYYYMMDDhhmmss)
  - `checkCriticalStatusCodes`: Check for error status codes (default: true)
  - `checkExposedEndpoints`: Check for exposed endpoints (default: true)
  - `checkContentChanges`: Analyze content changes (default: true)

**Returns:** `ScanResult` with findings and summary

#### `analyzeConfigurationChanges(url, limit?)`

Analyze content and configuration changes over time.

```typescript
const result = await scanner.analyzeConfigurationChanges('example.com', 1000);
```

**Parameters:**
- `url`: URL to analyze
- `limit`: Maximum records to analyze (default: 1000)

**Returns:** `ScanResult` focused on configuration changes

#### `searchVulnerableEndpoints(domain, endpoints?)`

Search for known vulnerable endpoints across snapshots.

```typescript
const result = await scanner.searchVulnerableEndpoints('example.com', [
  '/admin',
  '/wp-admin',
  '/.env',
  '/config.php'
]);
```

**Parameters:**
- `domain`: Domain to search
- `endpoints`: List of endpoints to search for (uses defaults if not provided)

**Returns:** `ScanResult` with exposed endpoints

#### `getHistoricalSnapshots(url, options?)`

Retrieve historical snapshots with filtering options.

```typescript
const snapshots = await scanner.getHistoricalSnapshots('example.com', {
  limit: 100,
  fromDate: '20200101',
  toDate: '20231231',
  statusCode: '200'
});
```

**Parameters:**
- `url`: URL to get snapshots for
- `options`:
  - `limit`: Maximum snapshots (default: 1000)
  - `fromDate`: Start date
  - `toDate`: End date
  - `statusCode`: Filter by HTTP status code

**Returns:** Array of `CDXRecord[]`

### CDXAPI

Advanced CDX Server API client for direct queries.

```typescript
import { CDXAPI } from '@vulnerability-scanner/internet-archive';

const cdx = new CDXAPI();

// Search for URL
const records = await cdx.searchURL('example.com', 1000);

// Search with prefix
const prefixRecords = await cdx.searchPrefix('example.com/', 1000);

// Search domain and subdomains
const domainRecords = await cdx.searchDomain('example.com', 1000);

// Search by status code
const errorRecords = await cdx.searchByStatusCode('example.com', '500', 1000);

// Search by date range
const rangeRecords = await cdx.searchDateRange('example.com', '20200101', '20231231', 1000);
```

### WaybackAPI

Wayback Machine Availability API client.

```typescript
import { WaybackAPI } from '@vulnerability-scanner/internet-archive';

const wayback = new WaybackAPI();

// Check availability
const availability = await wayback.checkAvailability('example.com');

// Get latest snapshot
const latest = await wayback.getLatestSnapshot('example.com');

// Get snapshot in range
const ranged = await wayback.getSnapshotInRange('example.com', '20200101', '20231231');
```

## Data Types

### ScanResult

```typescript
interface ScanResult {
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
```

### VulnerabilityFinding

```typescript
interface VulnerabilityFinding {
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
```

### CDXRecord

```typescript
interface CDXRecord {
  urlkey: string;
  timestamp: string;
  original: string;
  mimetype: string;
  statuscode: string;
  digest: string;
  length: string;
}
```

## Examples

### Example 1: Basic Vulnerability Scan

```typescript
const scanner = new InternetArchiveVulnerabilityScanner();
const result = await scanner.scan('vulnerable-site.com');

console.log(`Risk Level: ${result.risk_level}`);
console.log(`Critical Issues: ${result.summary.by_severity.critical}`);
console.log(`High Issues: ${result.summary.by_severity.high}`);

// Output all findings
result.findings.forEach(finding => {
  console.log(`
    [${finding.severity.toUpperCase()}] ${finding.finding_type}
    URL: ${finding.url}
    Timestamp: ${finding.timestamp}
    Description: ${finding.description}
  `);
});
```

### Example 2: Track Configuration Changes

```typescript
const scanner = new InternetArchiveVulnerabilityScanner();
const changes = await scanner.analyzeConfigurationChanges('example.com', 500);

const criticalChanges = changes.findings.filter(f => f.severity === 'critical');
console.log(`Found ${criticalChanges.length} critical changes`);

criticalChanges.forEach(change => {
  console.log(`
    Changed on: ${change.timestamp}
    Endpoint: ${change.url}
    Previous Hash: ${change.evidence.previous_digest}
    Current Hash: ${change.evidence.current_digest}
  `);
});
```

### Example 3: Find Exposed Admin Panels

```typescript
const scanner = new InternetArchiveVulnerabilityScanner();
const result = await scanner.searchVulnerableEndpoints('company.com', [
  '/admin',
  '/administrator',
  '/wp-admin',
  '/phpmyadmin'
]);

result.findings.forEach(finding => {
  console.log(`Exposed: ${finding.url} (${finding.timestamp})`);
  console.log(`Archive: ${finding.archived_url}`);
});
```

### Example 4: Get Historical Snapshots

```typescript
const scanner = new InternetArchiveVulnerabilityScanner();
const snapshots = await scanner.getHistoricalSnapshots('api.example.com', {
  limit: 100,
  statusCode: '200'
});

console.log(`Total snapshots found: ${snapshots.length}`);
snapshots.forEach(snap => {
  console.log(`${snap.timestamp}: ${snap.original} (${snap.statuscode})`);
});
```

## Vulnerability Detection

The scanner identifies several types of vulnerabilities:

### HTTP Status Codes
- **401 Unauthorized**: Authentication bypass possibilities
- **403 Forbidden**: Access control misconfiguration
- **500 Internal Server Error**: May expose sensitive information
- **502 Bad Gateway**: Service disruption
- **503 Service Unavailable**: Denial of Service

### Exposed Endpoints
- Admin pages (/admin, /administrator, /wp-admin, /phpmyadmin)
- Configuration files (.env, .config, config.php, settings.ini)
- Debug pages (/debug, /test, /dev, /staging)

### Configuration Changes
- Significant content changes detected between snapshots
- Rapid modifications (within 10 days) that may indicate compromise

## Logging

The module uses Pino for structured logging:

```typescript
import { logger } from '@vulnerability-scanner/internet-archive';

logger.debug('Debug message', { metadata: 'value' });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);

// Change log level at runtime
logger.setLevel('debug');
```

## API Rate Limiting

The Internet Archive may rate limit requests. The module includes:
- Configurable retry logic
- Delay between retries
- Exponential backoff support (implement in your code if needed)

## Performance Tips

1. Use `limit` parameter to reduce result set size
2. Specify date ranges to narrow searches
3. Use `fromDate` and `toDate` for targeted analysis
4. Consider pagination for large domains
5. Cache results when performing multiple scans

## Error Handling

```typescript
try {
  const result = await scanner.scan('example.com');
} catch (error) {
  if (error instanceof Error) {
    console.error('Scan failed:', error.message);
  }
}
```

## License

MIT

## Contributing

Contributions are welcome. Please ensure all tests pass and code follows TypeScript best practices.

## Support

For issues or questions:
1. Check the examples in `src/examples.ts`
2. Review the Internet Archive API documentation: https://archive.org/help/wayback_api.php
3. Check CDX Server documentation: https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server

## References

- [Wayback Machine APIs](https://archive.org/help/wayback_api.php)
- [CDX Server API](https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server)
- [Internet Archive](https://archive.org/)
- [Wayback Machine](https://web.archive.org/)
