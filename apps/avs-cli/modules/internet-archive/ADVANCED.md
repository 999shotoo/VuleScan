# Advanced Usage Guide

## Advanced Patterns & Techniques

### 1. Custom Vulnerability Patterns

Define custom patterns for your organization:

```typescript
import { InternetArchiveVulnerabilityScanner, VulnerablePattern } from '@vulnerability-scanner/internet-archive';

const customPatterns: VulnerablePattern[] = [
  {
    name: 'Internal APIs',
    patterns: [/\/internal\//, /\/admin\/api\//, /\/v1\/internal\//],
    severity: 'high',
    description: 'Internal APIs exposed to public',
  },
  {
    name: 'Legacy Systems',
    patterns: [/\/old/, /\/legacy/, /\/deprecated/],
    severity: 'medium',
    description: 'Legacy system endpoints detected',
  },
];

// Use with custom vulnerability scanner
class CustomVulnerabilityScanner extends InternetArchiveVulnerabilityScanner {
  async scan(targetUrl: string) {
    const result = await super.scan(targetUrl);
    
    // Add custom pattern detection
    // ... implement custom logic
    
    return result;
  }
}
```

### 2. Batch Scanning with Progress Tracking

```typescript
import { InternetArchiveVulnerabilityScanner, ScanResult } from '@vulnerability-scanner/internet-archive';

async function batchScanWithProgress(
  urls: string[],
  onProgress?: (current: number, total: number) => void
): Promise<ScanResult[]> {
  const scanner = new InternetArchiveVulnerabilityScanner();
  const results: ScanResult[] = [];
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 0; i < urls.length; i++) {
    try {
      const result = await scanner.scan(urls[i]);
      results.push(result);
      
      onProgress?.(i + 1, urls.length);
      
      // Respect rate limits
      if (i < urls.length - 1) {
        await delay(5000);
      }
    } catch (error) {
      console.error(`Failed to scan ${urls[i]}:`, error);
    }
  }

  return results;
}

// Usage:
const urls = ['site1.com', 'site2.com', 'site3.com'];
const results = await batchScanWithProgress(urls, (current, total) => {
  console.log(`Progress: ${current}/${total}`);
});
```

### 3. Real-time Finding Analysis

```typescript
import { InternetArchiveVulnerabilityScanner } from '@vulnerability-scanner/internet-archive';
import { filterBySeverity, sortBySeverity } from '@vulnerability-scanner/internet-archive';

async function analyzeFindingsInRealTime(targetUrl: string) {
  const scanner = new InternetArchiveVulnerabilityScanner({
    log_level: 'debug'
  });

  const result = await scanner.scan(targetUrl);

  // Get critical findings immediately
  const critical = filterBySeverity(result.findings, 'critical');
  
  if (critical.length > 0) {
    console.log('CRITICAL FINDINGS DETECTED!');
    critical.forEach(finding => {
      console.log(`
        📍 URL: ${finding.url}
        🕐 Discovery Time: ${finding.timestamp}
        🔗 Archive: ${finding.archived_url}
        📝 Description: ${finding.description}
      `);
      
      // Take immediate action
      alertSecurityTeam(finding);
    });
  }

  // Categorize remaining findings
  const high = filterBySeverity(result.findings, 'high');
  const medium = filterBySeverity(result.findings, 'medium');

  console.log(`
    📊 Summary:
    🔴 Critical: ${critical.length}
    🟠 High: ${high.length}
    🟡 Medium: ${medium.length}
    Overall Risk: ${result.risk_level}
  `);
}
```

### 4. Historical Vulnerability Tracking

```typescript
import { InternetArchiveVulnerabilityScanner } from '@vulnerability-scanner/internet-archive';

interface VulnerabilityHistory {
  url: string;
  first_detected: string;
  last_detected: string;
  total_occurrences: number;
  severity: string;
}

async function trackVulnerabilityHistory(
  targetUrl: string,
  fromDate: string,
  toDate: string
): Promise<VulnerabilityHistory[]> {
  const scanner = new InternetArchiveVulnerabilityScanner();
  const result = await scanner.scan(targetUrl, { fromDate, toDate });

  // Group findings by URL to track history
  const history: Map<string, VulnerabilityHistory> = new Map();

  result.findings.forEach(finding => {
    const key = finding.url;
    const existing = history.get(key);

    if (existing) {
      existing.total_occurrences++;
      existing.last_detected = finding.timestamp;
    } else {
      history.set(key, {
        url: finding.url,
        first_detected: finding.timestamp,
        last_detected: finding.timestamp,
        total_occurrences: 1,
        severity: finding.severity,
      });
    }
  });

  return Array.from(history.values())
    .sort((a, b) => b.total_occurrences - a.total_occurrences);
}
```

### 5. Comparative Analysis (Before/After)

```typescript
import { InternetArchiveVulnerabilityScanner, ScanResult } from '@vulnerability-scanner/internet-archive';

async function compareTimeFrames(
  targetUrl: string,
  beforeDate: string,
  afterDate: string
): Promise<{
  resolved: string[];
  new: string[];
  persistent: string[];
}> {
  const scanner = new InternetArchiveVulnerabilityScanner();

  // Get findings before remediation
  const beforeResult = await scanner.analyzeConfigurationChanges(targetUrl);
  const beforeUrls = new Set(beforeResult.findings.map(f => f.url));

  // Get findings after remediation
  const afterResult = await scanner.scan(targetUrl);
  const afterUrls = new Set(afterResult.findings.map(f => f.url));

  return {
    resolved: Array.from(beforeUrls).filter(url => !afterUrls.has(url)),
    new: Array.from(afterUrls).filter(url => !beforeUrls.has(url)),
    persistent: Array.from(beforeUrls).filter(url => afterUrls.has(url)),
  };
}
```

### 6. Advanced Filtering & Reporting

```typescript
import {
  InternetArchiveVulnerabilityScanner,
  filterBySeverity,
  groupBySeverity,
  groupByType,
  generateSummaryReport
} from '@vulnerability-scanner/internet-archive';

async function generateDetailedReport(targetUrl: string) {
  const scanner = new InternetArchiveVulnerabilityScanner();
  const result = await scanner.scan(targetUrl);

  // Generate comprehensive report
  const report = {
    target: result.target_url,
    scan_date: result.scan_date.toISOString(),
    overall_risk: result.risk_level,
    
    summary: generateSummaryReport(result.findings),
    
    by_severity: Object.entries(groupBySeverity(result.findings))
      .map(([severity, findings]) => ({
        severity,
        count: findings.length,
        examples: findings.slice(0, 3).map(f => ({
          url: f.url,
          timestamp: f.timestamp,
          description: f.description,
        })),
      })),
    
    by_type: Object.entries(groupByType(result.findings))
      .map(([type, findings]) => ({
        type,
        count: findings.length,
      })),
    
    critical_findings: filterBySeverity(result.findings, 'critical'),
    
    recommendations: generateRecommendations(result),
  };

  return report;
}

function generateRecommendations(result: any): string[] {
  const recommendations: string[] = [];

  if (result.summary.by_severity.critical > 0) {
    recommendations.push('IMMEDIATE ACTION: Address critical findings within 24 hours');
  }

  if (result.summary.by_type.exposed_endpoint > 0) {
    recommendations.push('Implement authentication on exposed endpoints');
    recommendations.push('Review and remove unnecessary admin interfaces');
  }

  if (result.summary.by_type.configuration_change > 0) {
    recommendations.push('Implement configuration management best practices');
    recommendations.push('Monitor for unauthorized configuration changes');
  }

  return recommendations;
}
```

### 7. Integration with Monitoring Systems

```typescript
import { InternetArchiveVulnerabilityScanner } from '@vulnerability-scanner/internet-archive';

// Integration with Slack
async function notifySlack(findings: any) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  
  await fetch(webhook, {
    method: 'POST',
    body: JSON.stringify({
      text: `🚨 Vulnerability Scan Results`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Critical*: ${findings.critical}\n*High*: ${findings.high}`,
          },
        },
      ],
    }),
  });
}

// Integration with monitoring APIs
async function sendToMonitoring(result: any) {
  // Send to DataDog, New Relic, etc.
  await fetch('https://api.datadoghq.com/api/v1/events', {
    method: 'POST',
    headers: {
      'DD-API-KEY': process.env.DD_API_KEY,
    },
    body: JSON.stringify({
      title: `Vulnerability Scan: ${result.target_url}`,
      text: `Found ${result.summary.total_vulnerabilities} vulnerabilities`,
      priority: result.risk_level === 'critical' ? 'urgent' : 'normal',
      tags: [`scan:ia`, `target:${result.target_url}`],
    }),
  });
}
```

### 8. Custom Severity Calculation

```typescript
import { InternetArchiveVulnerabilityScanner, VulnerabilityFinding } from '@vulnerability-scanner/internet-archive';

function calculateCustomSeverity(finding: VulnerabilityFinding): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  // Custom logic based on your organization's risk assessment
  
  // Admin panels are always critical
  if (finding.url.includes('/admin')) {
    return 'critical';
  }
  
  // Configuration files with recent captures are high
  if (finding.url.includes('.env')) {
    const timestamp = new Date(finding.timestamp);
    const daysSince = Math.floor((Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince < 365 ? 'high' : 'medium';
  }
  
  return finding.severity;
}

// Apply custom severity to findings
async function enhanceFindings(targetUrl: string) {
  const scanner = new InternetArchiveVulnerabilityScanner();
  const result = await scanner.scan(targetUrl);
  
  result.findings.forEach(finding => {
    finding.severity = calculateCustomSeverity(finding);
  });
  
  return result;
}
```

### 9. Scheduled Scanning

```typescript
import { InternetArchiveVulnerabilityScanner } from '@vulnerability-scanner/internet-archive';
import * as schedule from 'node-schedule';

// Schedule weekly scans
function scheduleWeeklyScan(targetUrl: string) {
  // Run every Monday at 2 AM
  schedule.scheduleJob('0 2 * * 1', async () => {
    console.log(`Starting scheduled scan for ${targetUrl}`);
    
    try {
      const scanner = new InternetArchiveVulnerabilityScanner();
      const result = await scanner.scan(targetUrl);
      
      // Process results
      await processAndStore(result);
    } catch (error) {
      console.error('Scheduled scan failed:', error);
      notifyAdmin('Scan scheduling error', error);
    }
  });
}

async function processAndStore(result: any) {
  // Store in database, send alerts, etc.
  console.log(`Scan complete: ${result.findings.length} findings`);
}
```

### 10. Export to Different Formats

```typescript
import { InternetArchiveVulnerabilityScanner, ScanResult } from '@vulnerability-scanner/internet-archive';
import { promises as fs } from 'fs';

async function exportResults(result: ScanResult, format: 'json' | 'csv' | 'html') {
  switch (format) {
    case 'json':
      await fs.writeFile(
        `report_${result.target_url}.json`,
        JSON.stringify(result, null, 2)
      );
      break;
      
    case 'csv':
      const csv = convertToCSV(result);
      await fs.writeFile(`report_${result.target_url}.csv`, csv);
      break;
      
    case 'html':
      const html = generateHTML(result);
      await fs.writeFile(`report_${result.target_url}.html`, html);
      break;
  }
}

function convertToCSV(result: ScanResult): string {
  let csv = 'URL,Severity,Type,Timestamp,Description\n';
  
  result.findings.forEach(finding => {
    csv += `"${finding.url}","${finding.severity}","${finding.finding_type}","${finding.timestamp}","${finding.description}"\n`;
  });
  
  return csv;
}

function generateHTML(result: ScanResult): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Vulnerability Report - ${result.target_url}</title>
      <style>
        body { font-family: Arial, sans-serif; }
        .critical { color: red; }
        .high { color: orange; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      </style>
    </head>
    <body>
      <h1>Vulnerability Scan Report</h1>
      <p><strong>Target:</strong> ${result.target_url}</p>
      <p><strong>Risk Level:</strong> ${result.risk_level}</p>
      <p><strong>Findings:</strong> ${result.summary.total_vulnerabilities}</p>
      <table>
        <tr>
          <th>URL</th>
          <th>Severity</th>
          <th>Type</th>
          <th>Timestamp</th>
        </tr>
        ${result.findings.map(f => `
          <tr class="${f.severity}">
            <td><a href="${f.archived_url}">${f.url}</a></td>
            <td>${f.severity.toUpperCase()}</td>
            <td>${f.finding_type}</td>
            <td>${f.timestamp}</td>
          </tr>
        `).join('')}
      </table>
    </body>
    </html>
  `;
}
```

## Performance Optimization

### Caching Results

```typescript
import { ScanResult } from '@vulnerability-scanner/internet-archive';

class CachedScanner {
  private cache: Map<string, ScanResult> = new Map();
  private cacheExpiry: number = 24 * 60 * 60 * 1000; // 24 hours

  async scan(targetUrl: string): Promise<ScanResult> {
    const cached = this.cache.get(targetUrl);
    
    if (cached && this.isValid(cached)) {
      return cached;
    }

    // Perform fresh scan
    // const result = await scanner.scan(targetUrl);
    // this.cache.set(targetUrl, result);
    return {} as ScanResult; // placeholder
  }

  private isValid(result: ScanResult): boolean {
    const timeSince = Date.now() - result.scan_date.getTime();
    return timeSince < this.cacheExpiry;
  }
}
```

## Best Practices

1. **Error Handling**: Always wrap scans in try-catch blocks
2. **Rate Limiting**: Implement delays between requests
3. **Logging**: Use structured logging for debugging
4. **Caching**: Cache results to avoid duplicate API calls
5. **Monitoring**: Track scan performance and failures
6. **Notifications**: Alert on critical findings immediately
7. **Documentation**: Maintain scan reports for compliance
8. **Validation**: Verify findings independently when possible
