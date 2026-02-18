# Quick Start Guide

## Installation

```bash
npm install @vulnerability-scanner/internet-archive
```

## Basic Usage

### 1. Simple Vulnerability Scan

```typescript
import { InternetArchiveVulnerabilityScanner } from '@vulnerability-scanner/internet-archive';

const scanner = new InternetArchiveVulnerabilityScanner();

// Scan a URL
const result = await scanner.scan('example.com');

console.log(`
  Target: ${result.target_url}
  Risk Level: ${result.risk_level}
  Total Vulnerabilities: ${result.summary.total_vulnerabilities}
  Critical: ${result.summary.by_severity.critical}
  High: ${result.summary.by_severity.high}
`);
```

### 2. Search for Exposed Admin Panels

```typescript
import { InternetArchiveVulnerabilityScanner } from '@vulnerability-scanner/internet-archive';

const scanner = new InternetArchiveVulnerabilityScanner();

const result = await scanner.searchVulnerableEndpoints('mycompany.com', [
  '/admin',
  '/administrator',
  '/wp-admin',
  '/phpmyadmin'
]);

result.findings.forEach(finding => {
  console.log(`Found: ${finding.url} (${finding.timestamp})`);
  console.log(`Archive: ${finding.archived_url}`);
});
```

### 3. Analyze Configuration Changes

```typescript
import { InternetArchiveVulnerabilityScanner } from '@vulnerability-scanner/internet-archive';

const scanner = new InternetArchiveVulnerabilityScanner();

const result = await scanner.analyzeConfigurationChanges('api.example.com');

result.findings.forEach(finding => {
  console.log(`
    Change detected: ${finding.timestamp}
    Previous: ${finding.evidence.previous_digest}
    Current: ${finding.evidence.current_digest}
  `);
});
```

### 4. Get Historical Snapshots

```typescript
import { InternetArchiveVulnerabilityScanner } from '@vulnerability-scanner/internet-archive';

const scanner = new InternetArchiveVulnerabilityScanner();

// Get snapshots from 2020-2023
const snapshots = await scanner.getHistoricalSnapshots('old-service.com', {
  fromDate: '20200101',
  toDate: '20231231',
  limit: 100
});

console.log(`Found ${snapshots.length} snapshots`);

snapshots.forEach(snap => {
  console.log(`${snap.timestamp}: ${snap.original}`);
});
```

### 5. Filter and Analyze Results

```typescript
import { 
  InternetArchiveVulnerabilityScanner, 
  filterBySeverity, 
  sortBySeverity,
  generateSummaryReport 
} from '@vulnerability-scanner/internet-archive';

const scanner = new InternetArchiveVulnerabilityScanner();
const result = await scanner.scan('example.com');

// Get critical findings
const critical = filterBySeverity(result.findings, 'critical');
console.log(`Critical issues: ${critical.length}`);

// Get summary report
const summary = generateSummaryReport(result.findings);
console.log(summary);

// Get top 5 findings
const top = sortBySeverity(result.findings).slice(0, 5);
```

### 6. Use Direct APIs

```typescript
import { CDXAPI, WaybackAPI } from '@vulnerability-scanner/internet-archive';

// CDX API for advanced queries
const cdx = new CDXAPI();
const records = await cdx.searchURL('example.com', 1000);
console.log(`Found ${records.length} captures`);

// Search by status code (e.g., all 500 errors)
const errors = await cdx.searchByStatusCode('example.com', '500', 100);
console.log(`Found ${errors.length} error pages`);

// Wayback API
const wayback = new WaybackAPI();
const availability = await wayback.checkAvailability('example.com');
if (availability.archived_snapshots.closest?.available) {
  console.log(`Latest: ${availability.archived_snapshots.closest.url}`);
}
```

## Configuration Options

```typescript
const scanner = new InternetArchiveVulnerabilityScanner({
  timeout: 30000,              // Request timeout in ms
  retries: 3,                  // Number of retries
  retry_delay: 1000,           // Delay between retries
  enable_pagination: false,    // Enable pagination for large results
  max_results: 10000,          // Max results per query
  user_agent: 'CustomUA',      // Custom User-Agent
  log_level: 'info'            // 'debug' | 'info' | 'warn' | 'error'
});
```

## Common Vulnerable Endpoints

The scanner includes default checks for:

- **Admin Pages**: /admin, /administrator, /wp-admin, /phpmyadmin
- **Configuration Files**: .env, .env.local, config.php
- **Git Repositories**: .git, .github
- **AWS Credentials**: .aws/credentials
- **Backup Files**: /backup.sql, /backup.zip
- **Debug Pages**: /debug, /dev, /test

## Output Examples

### ScanResult Format

```typescript
{
  target_url: 'example.com',
  scan_date: 2024-02-15T10:30:00Z,
  total_captures: 250,
  risk_level: 'high',
  findings: [...],
  summary: {
    total_vulnerabilities: 5,
    by_severity: {
      critical: 1,
      high: 2,
      medium: 2,
      low: 0,
      info: 0
    },
    by_type: {
      exposed_endpoint: 3,
      status_change: 2
    }
  }
}
```

### VulnerabilityFinding Format

```typescript
{
  url: 'https://example.com/admin',
  timestamp: '20230115123456',
  archived_url: 'https://web.archive.org/web/20230115123456/example.com/admin',
  status_code: '200',
  mimetype: 'text/html',
  severity: 'critical',
  finding_type: 'exposed_endpoint',
  description: 'Administrative pages may be exposed',
  evidence: {
    pattern_name: 'Exposed Admin Pages',
    matched_url: 'https://example.com/admin'
  }
}
```

## Interpreting Results

### Risk Levels

- **Critical**: Immediate action required. Published vulnerabilities or exposed admin/config
- **High**: Should be addressed soon. Error pages, access control issues
- **Medium**: Plan to address. Configuration changes, potential access issues
- **Low**: Monitor. Minor issues or informational findings
- **None**: No vulnerabilities detected

### Finding Types

- **exposed_endpoint**: Admin/config files or other sensitive endpoints found
- **status_change**: Unusual HTTP status codes detected
- **configuration_change**: Content changes detected between snapshots
- **historical_data**: Historical vulnerability or change
- **suspicious_content**: Potentially malicious content detected

## Performance Tips

1. **Limit Results**: Use `limit` parameter to reduce API calls
2. **Date Ranges**: Narrow searches to specific time periods
3. **Batch Scanning**: Scan multiple URLs sequentially, not in parallel (API limits)
4. **Cache Results**: Store results locally to avoid re-scanning
5. **Use Direct APIs**: For advanced queries, use CDXAPI directly

## Troubleshooting

### No results returned

- Verify the URL has been archived (check web.archive.org manually)
- Try with a simpler URL (e.g., just domain without path)
- Check date ranges are correct

### Rate limiting

- Reduce `max_results` limit
- Increase `retry_delay`
- Add delays between multiple scans
- Consider using pagination for large domains

### Timeout errors

- Increase `timeout` value
- Reduce `max_results` limit
- Check internet connection

## Next Steps

1. Check [README.md](./README.md) for complete API documentation
2. Review [examples.ts](./src/examples.ts) for advanced usage
3. Explore [utils.ts](./src/utils.ts) for filtering and analysis utilities
4. Check Internet Archive documentation: https://archive.org/help/wayback_api.php

## Support

For issues or questions, refer to:
- Official docs: https://archive.org/help/wayback_api.php
- CDX Server: https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server
- Wayback Machine: https://web.archive.org/
