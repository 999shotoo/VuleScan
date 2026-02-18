/**
 * Example usage of the Internet Archive Vulnerability Scanner
 */

import { InternetArchiveVulnerabilityScanner } from './index';
import logger from './logger';

async function main() {
  // Initialize the scanner with configuration
  const scanner = new InternetArchiveVulnerabilityScanner({
    timeout: 30000,
    retries: 3,
    retry_delay: 1000,
    max_results: 10000,
    log_level: 'info',
  });

  try {
    // Example 1: Basic vulnerability scan of a URL
    logger.info('=== Example 1: Basic Vulnerability Scan ===');
    const scanResult = await scanner.scan('example.com', {
      checkCriticalStatusCodes: true,
      checkExposedEndpoints: true,
      checkContentChanges: true,
    });

    logger.info('Scan Result Summary:', {
      target: scanResult.target_url,
      total_captures: scanResult.total_captures,
      total_findings: scanResult.summary.total_vulnerabilities,
      risk_level: scanResult.risk_level,
      by_severity: scanResult.summary.by_severity,
    });

    // Log detailed findings
    scanResult.findings.forEach((finding, index) => {
      logger.info(`Finding ${index + 1}:`, {
        url: finding.url,
        severity: finding.severity,
        type: finding.finding_type,
        description: finding.description,
        timestamp: finding.timestamp,
      });
    });

    // Example 2: Analyze configuration changes over time
    logger.info('\n=== Example 2: Configuration Changes ===');
    const configChanges = await scanner.analyzeConfigurationChanges('example.com', 100);

    logger.info('Configuration Analysis:', {
      target: configChanges.target_url,
      total_changes: configChanges.summary.total_vulnerabilities,
      changes_details: configChanges.findings.slice(0, 5),
    });

    // Example 3: Search for vulnerable endpoints
    logger.info('\n=== Example 3: Vulnerable Endpoints ===');
    const vulnerableEndpoints = await scanner.searchVulnerableEndpoints('example.com', [
      '/admin',
      '/wp-admin',
      '/.env',
      '/config.php',
      '/database.yml',
    ]);

    logger.info('Vulnerable Endpoints Found:', {
      target: vulnerableEndpoints.target_url,
      total_endpoints: vulnerableEndpoints.summary.total_vulnerabilities,
      findings: vulnerableEndpoints.findings,
    });

    // Example 4: Get historical snapshots for a specific time period
    logger.info('\n=== Example 4: Historical Snapshots ===');
    const snapshots = await scanner.getHistoricalSnapshots('example.com', {
      fromDate: '20200101',
      toDate: '20231231',
      limit: 50,
    });

    logger.info('Historical Snapshots:', {
      target: 'example.com',
      total_snapshots: snapshots.length,
      first_snapshot: snapshots[0],
      last_snapshot: snapshots[snapshots.length - 1],
    });

    // Example 5: Search for specific status codes (vulnerability indicators)
    logger.info('\n=== Example 5: Status Code Analysis ===');
    const errorSnapshots = await scanner.getHistoricalSnapshots('example.com', {
      statusCode: '500',
      limit: 20,
    });

    logger.info('Error Pages Found (500 Status):', {
      target: 'example.com',
      total_errors: errorSnapshots.length,
      examples: errorSnapshots.slice(0, 3),
    });

    // Export results to JSON
    const results = {
      scan_timestamp: new Date().toISOString(),
      scan_results: scanResult,
      configuration_changes: configChanges,
      vulnerable_endpoints: vulnerableEndpoints,
      historical_snapshots_count: snapshots.length,
    };

    logger.info('Scan Complete - Results:', results);
  } catch (error) {
    logger.error('Error during scanning:', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

// Uncomment to run the example
// main();

export { main };
