#!/usr/bin/env node

/**
 * Internet Archive Vulnerability Scanner - CLI Interface
 * Usage: ia-scanner <url> [options]
 */

import { InternetArchiveVulnerabilityScanner, logger } from './index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface CLIOptions {
  url: string;
  from?: string;
  to?: string;
  output?: 'json' | 'text' | 'csv';
  file?: string;
  verbose?: boolean;
  config?: boolean;
  help?: boolean;
  endpoints?: string;
  changes?: boolean;
  snapshots?: boolean;
}

class CLIScanner {
  private scanner: InternetArchiveVulnerabilityScanner;

  constructor() {
    this.scanner = new InternetArchiveVulnerabilityScanner({
      log_level: process.argv.includes('--verbose') ? 'debug' : 'info',
      timeout: 60000,
      max_results: 1000,
      retries: 2,
      retry_delay: 2000,
    });
  }

  async run(): Promise<void> {
    try {
      const args = process.argv.slice(2);

      if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        this.showHelp();
        return;
      }

      if (args.includes('--config')) {
        this.showConfig();
        return;
      }

      const options = this.parseArgs(args);

      if (!options.url) {
        console.error('❌ Error: URL is required');
        this.showHelp();
        process.exit(1);
      }

      console.log('🔍 Internet Archive Vulnerability Scanner\n');
      console.log(`Target: ${options.url}`);
      console.log(`Mode: ${this.getMode(options)}\n`);

      let result;

      if (options.endpoints) {
        result = await this.scanEndpoints(options);
      } else if (options.changes) {
        result = await this.analyzeChanges(options);
      } else if (options.snapshots) {
        result = await this.getSnapshots(options);
      } else {
        result = await this.fullScan(options);
      }

      await this.outputResults(result, options);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      logger.error('CLI Error', error instanceof Error ? error : new Error(String(error)));
      process.exit(1);
    }
  }

  private parseArgs(args: string[]): CLIOptions {
    const options: CLIOptions = { url: '' };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');

        switch (key) {
          case 'from':
            options.from = value || args[++i];
            break;
          case 'to':
            options.to = value || args[++i];
            break;
          case 'output':
            options.output = (value || args[++i]) as 'json' | 'text' | 'csv';
            break;
          case 'file':
            options.file = value || args[++i];
            break;
          case 'endpoints':
            options.endpoints = value || args[++i];
            break;
          case 'verbose':
            options.verbose = true;
            break;
          case 'changes':
            options.changes = true;
            break;
          case 'snapshots':
            options.snapshots = true;
            break;
        }
      } else if (!arg.startsWith('-')) {
        if (!options.url) {
          options.url = arg;
        }
      }
    }

    options.output = options.output || 'text';
    return options;
  }

  private async fullScan(options: CLIOptions): Promise<any> {
    console.log('Starting full vulnerability scan...\n');
    console.log('⏳ This may take a minute or two for large domains...\\n');

    try {
      const result = await this.scanner.scan(options.url, {
        fromDate: options.from,
        toDate: options.to,
        checkCriticalStatusCodes: true,
        checkExposedEndpoints: true,
        checkContentChanges: false,
      });

      return result;
    } catch (error) {
      console.log('⚠️  Full scan encountered issues. Trying quick snapshot scan...\\n');
      return this.getSnapshots(options);
    }
  }

  private async scanEndpoints(options: CLIOptions): Promise<any> {
    console.log('Searching for vulnerable endpoints...\n');
    console.log('⏳ Analyzing snapshots...\\n');

    try {
      const endpoints = options.endpoints?.split(',').map(e => e.trim()) || [];

      const result = await this.scanner.searchVulnerableEndpoints(options.url, endpoints);

      return result;
    } catch (error) {
      console.log('⚠️  Endpoint search timed out. Try:');
      console.log('   1. Reduce number of endpoints');
      console.log('   2. Use date range: --from=20230101 --to=20231231');
      console.log('   3. Search specific domain without subdomains\\n');
      return { target_url: options.url, findings: [], summary: { total_vulnerabilities: 0, by_severity: {}, by_type: {} } };
    }
  }

  private async analyzeChanges(options: CLIOptions): Promise<any> {
    console.log('Analyzing configuration changes...\n');
    console.log('⏳ Processing archive data...\\n');

    try {
      const result = await this.scanner.analyzeConfigurationChanges(options.url, 500);

      return result;
    } catch (error) {
      console.log('⚠️  Analysis timed out. Try:');
      console.log('   1. Use a simpler domain');
      console.log('   2. Try with --from and --to date range');
      console.log('   3. Reduce the URL complexity\\n');
      return { target_url: options.url, findings: [], summary: { total_vulnerabilities: 0, by_severity: {}, by_type: {} } };
    }
  }

  private async getSnapshots(options: CLIOptions): Promise<any> {
    console.log('Retrieving historical snapshots...\n');
    console.log('⏳ Fetching from Wayback Machine...\\n');

    try {
      const snapshots = await this.scanner.getHistoricalSnapshots(options.url, {
        fromDate: options.from,
        toDate: options.to,
        limit: 500,
      });

      return { url: options.url, snapshots, count: snapshots.length };
    } catch (error) {
      console.log('⚠️  Snapshot retrieval timed out. Try:');
      console.log('   1. Add date range: --from=20230101 --to=20231231');
      console.log('   2. Use simpler domain: example.com instead of subdomain');
      console.log('   3. Try later when Archive API is less busy\\n');
      return { url: options.url, snapshots: [], count: 0 };
    }
  }

  private getMode(options: CLIOptions): string {
    if (options.endpoints) return 'Endpoint Search';
    if (options.changes) return 'Configuration Analysis';
    if (options.snapshots) return 'Snapshot Retrieval';
    return 'Full Vulnerability Scan';
  }

  private async outputResults(result: any, options: CLIOptions): Promise<void> {
    if (options.output === 'json') {
      this.outputJSON(result, options);
    } else if (options.output === 'csv') {
      this.outputCSV(result, options);
    } else {
      this.outputText(result, options);
    }
  }

  private outputText(result: any, options: CLIOptions): void {
    if (result.findings) {
      // Full scan or endpoint search result
      console.log('═'.repeat(60));
      console.log(`📊 SCAN RESULTS - ${result.target_url}`);
      console.log('═'.repeat(60));
      console.log(`\n⏰ Scan Date: ${new Date(result.scan_date).toISOString()}`);
      console.log(`📦 Total Captures: ${result.total_captures}`);
      console.log(`🚨 Total Findings: ${result.summary.total_vulnerabilities}`);
      console.log(`📈 Risk Level: ${result.risk_level.toUpperCase()}`);

      console.log('\n📋 Summary by Severity:');
      Object.entries(result.summary.by_severity).forEach(([severity, count]) => {
        const icon =
          severity === 'critical'
            ? '🔴'
            : severity === 'high'
              ? '🟠'
              : severity === 'medium'
                ? '🟡'
                : severity === 'low'
                  ? '🟢'
                  : '⚪';
        console.log(`  ${icon} ${severity.toUpperCase()}: ${count}`);
      });

      console.log('\n📁 Summary by Type:');
      Object.entries(result.summary.by_type).forEach(([type, count]) => {
        console.log(`  • ${type}: ${count}`);
      });

      if (result.findings.length > 0) {
        console.log('\n🔍 Top Findings:');
        result.findings.slice(0, 10).forEach((f: any, i: number) => {
          console.log(`\n  ${i + 1}. [${f.severity.toUpperCase()}] ${f.finding_type}`);
          console.log(`     URL: ${f.url}`);
          console.log(`     Time: ${f.timestamp}`);
          console.log(`     Description: ${f.description}`);
        });

        if (result.findings.length > 10) {
          console.log(`\n  ... and ${result.findings.length - 10} more findings`);
        }
      }
    } else if (result.snapshots) {
      // Snapshots result
      console.log('═'.repeat(60));
      console.log(`📷 HISTORICAL SNAPSHOTS - ${result.url}`);
      console.log('═'.repeat(60));
      console.log(`\n📦 Total Snapshots: ${result.count}\n`);

      result.snapshots.slice(0, 20).forEach((snap: any, i: number) => {
        console.log(`${i + 1}. ${snap.timestamp} - ${snap.original}`);
        console.log(`   Status: ${snap.statuscode} | Type: ${snap.mimetype}`);
      });

      if (result.count > 20) {
        console.log(`\n... and ${result.count - 20} more snapshots`);
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Scan completed successfully\n');

    if (options.file) {
      this.saveToFile(result, options.file, 'json').then(() => {
        console.log(`📁 Results saved to: ${options.file}\n`);
      });
    }
  }

  private outputJSON(result: any, options: CLIOptions): void {
    console.log(JSON.stringify(result, null, 2));

    if (options.file) {
      this.saveToFile(result, options.file, 'json');
    }
  }

  private outputCSV(result: any, options: CLIOptions): void {
    if (!result.findings) {
      console.error('❌ CSV output only available for findings');
      return;
    }

    let csv = 'URL,Severity,Type,Timestamp,StatusCode,Description\n';

    result.findings.forEach((f: any) => {
      csv += `"${f.url}","${f.severity}","${f.finding_type}","${f.timestamp}","${f.status_code}","${f.description}"\n`;
    });

    console.log(csv);

    if (options.file) {
      this.saveToFile(csv, options.file, 'csv');
    }
  }

  private async saveToFile(data: any, filepath: string, format: string): Promise<void> {
    const content = format === 'json' ? JSON.stringify(data, null, 2) : String(data);

    const dir = path.dirname(filepath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filepath, content, 'utf-8');
  }

  private showHelp(): void {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║   Internet Archive Vulnerability Scanner - CLI Mode         ║
╚══════════════════════════════════════════════════════════════╝

USAGE:
  ia-scanner <url> [options]

EXAMPLES:
  # Full scan
  ia-scanner example.com

  # Search for specific endpoints
  ia-scanner example.com --endpoints=/admin,/wp-admin,/.env

  # Analyze configuration changes
  ia-scanner example.com --changes

  # Get historical snapshots
  ia-scanner example.com --snapshots --from=20200101 --to=20231231

  # Full scan with date range and save to file
  ia-scanner example.com --from=20200101 --to=20231231 --output=json --file=report.json

OPTIONS:
  <url>                URL or domain to scan (required)
  
  --from=DATE         Start date (YYYYMMDD or YYYYMMDDhhmmss)
  --to=DATE           End date (YYYYMMDD or YYYYMMDDhhmmss)
  
  --endpoints=LIST    Search for specific endpoints (comma-separated)
  --changes           Analyze configuration changes only
  --snapshots         Retrieve historical snapshots only
  
  --output=FORMAT     Output format: text, json, csv (default: text)
  --file=PATH         Save results to file
  
  --verbose           Show debug information
  --config            Show configuration
  --help, -h          Show this help message

MODES:
  Full Scan (default)
    Detects: HTTP status codes, exposed endpoints, content changes
    
  Endpoint Search
    Finds: Vulnerable endpoints like /admin, /wp-admin, etc.
    Example: ia-scanner example.com --endpoints=/admin,/.env
    
  Configuration Analysis
    Shows: Content changes over time
    Example: ia-scanner example.com --changes
    
  Snapshot Retrieval
    Gets: Historical snapshots in a date range
    Example: ia-scanner example.com --snapshots --from=20200101

OUTPUT FORMATS:
  text     Human-readable report (default)
  json     Structured JSON output
  csv      Comma-separated values (for findings)

EXAMPLES IN DETAIL:

1. Quick scan of a website:
   ia-scanner github.com

2. Scan with date range:
   ia-scanner example.com --from=20200101 --to=20231231

3. Find exposed admin panels:
   ia-scanner mycompany.com --endpoints=/admin,/wp-admin,/phpmyadmin

4. Export results to JSON:
   ia-scanner example.com --output=json --file=results.json

5. Find all changes over time:
   ia-scanner example.com --changes --verbose

6. Get snapshots and save to file:
   ia-scanner example.com --snapshots --from=2020 --to=2023 --file=snapshots.json --output=json

NOTES:
  • Always scan URLs you own or have permission to scan
  • Results are cached by default
  • Date format: YYYYMMDD (e.g., 20230115)
  • Large scans may take several minutes
  • The Wayback Machine must have archived the URL

For more information, see:
  • README.md - Full documentation
  • QUICKSTART.md - Quick start guide
  • SECURITY.md - Security guidelines
    `);
  }

  private showConfig(): void {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║            Current Configuration                          ║
╚═══════════════════════════════════════════════════════════╝

Timeout:            30000ms (30 seconds)
Max Results:        10000 per query
Retry Attempts:     3
Retry Delay:        1000ms
Enable Pagination:  false
User Agent:         Mozilla/5.0 (Vulnerability Scanner)
Log Level:          ${process.argv.includes('--verbose') ? 'debug' : 'info'}

API Endpoints:
  • Wayback Machine: https://archive.org/wayback/available
  • CDX Server: https://web.archive.org/cdx/search/cdx

To run with verbose output:
  ia-scanner example.com --verbose

To customize timeout or other settings, edit the constructor
in the CLI file or use environment variables.
    `);
  }
}

// Main execution
const cli = new CLIScanner();
cli.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
