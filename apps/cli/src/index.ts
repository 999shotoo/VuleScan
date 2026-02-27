#!/usr/bin/env node
/**
 * AVS CLI - Vulnerability Scanner
 * A comprehensive TypeScript-based vulnerability scanner with interactive menu system
 *
 * Usage:
 *   npx avs-cli                              (interactive mode)
 *   npx avs-cli https://example.com          (with target URL)
 *   npx avs-cli https://example.com --all    (run all scans)
 */

import {
  displayError,
  displaySuccess,
  displayInfo,
  displayHeader,
  displaySummary,
  displayResult,
  isValidUrl,
  normalizeUrl,
  showLoadingSpinner,
} from "./utils.js";
import {
  saveScanReport,
  listScanReports,
  readScanReport,
} from "./fileHandler.js";
import {
  showMainMenu,
  selectSingleScan,
  selectMultipleScans,
  confirmAction,
  getTargetUrl,
  askWordlistPath,
  askSaveReport,
  askContinue,
  showHelp,
} from "./menuSystem.js";
import { scanModules, getScannerByName, getAllScannerNames } from "./scanners.js";
import { ScanResult, CLIOptions, ScanRunOptions } from "./types.js";

const WORDLIST_BASED_SCANNERS = new Set(["Directory Search", "Bruteforce"]);

/**
 * Parse command line arguments
 */
function parseArguments(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    targetUrl: "",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--all") {
      options.all = true;
    } else if (arg === "--json") {
      options.json = args[i + 1];
      i++;
    } else if (arg === "--wordlist") {
      options.wordlist = args[i + 1];
      i++;
    } else if (arg.startsWith("--wordlist=")) {
      options.wordlist = arg.split("=").slice(1).join("=");
    } else if (
      !arg.startsWith("-") &&
      (arg.includes(".") || arg.includes(":"))
    ) {
      options.targetUrl = arg;
    }
  }

  return options;
}

function needsWordlist(scannerNames: string[]): boolean {
  return scannerNames.some((name) => WORDLIST_BASED_SCANNERS.has(name));
}

async function resolveScanOptions(
  scannerNames: string[],
  cliWordlist?: string
): Promise<ScanRunOptions> {
  if (!needsWordlist(scannerNames)) {
    return {};
  }

  if (cliWordlist && cliWordlist.trim()) {
    return { wordlistPath: cliWordlist.trim() };
  }

  const wordlistPath = await askWordlistPath();
  return wordlistPath ? { wordlistPath } : {};
}

/**
 * Run a single scan
 */
async function runSingleScan(
  scannerName: string,
  targetUrl: string,
  scanOptions: ScanRunOptions = {}
): Promise<ScanResult> {
  const scanner = getScannerByName(scannerName);

  if (!scanner) {
    throw new Error(`Scanner '${scannerName}' not found`);
  }

  try {
    const result = await showLoadingSpinner(
      scanner.scan(targetUrl, scanOptions),
      `Running ${scanner.name}`
    );
    return result;
  } catch (error) {
    displayError(`Failed to run ${scanner.name}`);
    return {
      name: scanner.name,
      status: "safe",
      details: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Run multiple scans
 */
async function runMultipleScans(
  scannerNames: string[],
  targetUrl: string,
  scanOptions: ScanRunOptions = {}
): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

  for (const name of scannerNames) {
    const result = await runSingleScan(name, targetUrl, scanOptions);
    results.push(result);
    displayResult(result);
  }

  return results;
}

/**
 * Run all scans
 */
async function runAllScans(
  targetUrl: string,
  scanOptions: ScanRunOptions = {}
): Promise<ScanResult[]> {
  const allScannerNames = getAllScannerNames();
  return runMultipleScans(allScannerNames, targetUrl, scanOptions);
}

/**
 * Display results summary and statistics
 */
function displayResultsSummary(results: ScanResult[]): void {
  const vulnerable = results.filter((r) => r.status === "vulnerable").length;
  const safe = results.filter((r) => r.status === "safe").length;

  displaySummary(results.length, vulnerable, safe);

  if (vulnerable > 0) {
    displayInfo(`Found ${vulnerable} potential vulnerability/vulnerabilities.`);
  } else {
    displaySuccess("All scans passed! No vulnerabilities detected.");
  }
}

/**
 * Interactive mode - main CLI loop
 */
async function interactiveMode(initialUrl?: string): Promise<void> {
  let targetUrl = initialUrl || "";

  try {
    // Get target URL if not provided
    if (!targetUrl) {
      targetUrl = await getTargetUrl();
    }

    // Validate and normalize URL
    if (!isValidUrl(targetUrl)) {
      targetUrl = normalizeUrl(targetUrl);

      if (!isValidUrl(targetUrl)) {
        displayError("Invalid URL format. Please provide a valid URL.");
        return;
      }
    }

    displaySuccess(`Target set to: ${targetUrl}`);

    let continueScanning = true;

    while (continueScanning) {
      const choice = await showMainMenu();

      switch (choice) {
        case "single": {
          const scannerName = await selectSingleScan();

          if (scannerName === "back") {
            continue;
          }

          displayHeader("RUNNING SINGLE SCAN");
          const scanOptions = await resolveScanOptions([scannerName]);
          const result = await runSingleScan(scannerName, targetUrl, scanOptions);
          displayResult(result);
          displayResultsSummary([result]);

          const shouldSave = await askSaveReport();
          if (shouldSave) {
            try {
              const filepath = await saveScanReport(targetUrl, [result]);
              displaySuccess(`Report saved to: ${filepath}`);
            } catch (error) {
              displayError(
                `Failed to save report: ${error instanceof Error ? error.message : "Unknown error"}`
              );
            }
          }
          break;
        }

        case "multiple": {
          const scannerNames = await selectMultipleScans();

          if (scannerNames.length === 0) {
            displayError("No scanners selected");
            break;
          }

          displayHeader("RUNNING MULTIPLE SCANS");
          const scanOptions = await resolveScanOptions(scannerNames);
          const results = await runMultipleScans(scannerNames, targetUrl, scanOptions);
          displayResultsSummary(results);

          const shouldSave = await askSaveReport();
          if (shouldSave) {
            try {
              const filepath = await saveScanReport(targetUrl, results);
              displaySuccess(`Report saved to: ${filepath}`);
            } catch (error) {
              displayError(
                `Failed to save report: ${error instanceof Error ? error.message : "Unknown error"}`
              );
            }
          }
          break;
        }

        case "all": {
          const confirmed = await confirmAction(
            "Run all available scans? This may take a while."
          );

          if (confirmed) {
            displayHeader("RUNNING ALL SCANS");
            const scanOptions = await resolveScanOptions(getAllScannerNames());
            const results = await runAllScans(targetUrl, scanOptions);
            displayResultsSummary(results);

            const shouldSave = await askSaveReport();
            if (shouldSave) {
              try {
                const filepath = await saveScanReport(targetUrl, results);
                displaySuccess(`Report saved to: ${filepath}`);
              } catch (error) {
                displayError(
                  `Failed to save report: ${error instanceof Error ? error.message : "Unknown error"}`
                );
              }
            }
          }
          break;
        }

        case "help": {
          showHelp();
          break;
        }

        case "exit": {
          console.log("\nThank you for using AVS CLI. Goodbye! 👋\n");
          continueScanning = false;
          break;
        }

        default:
          displayError("Invalid option");
      }

      if (choice !== "help" && choice !== "exit" && continueScanning) {
        const shouldContinue = await askContinue();
        if (!shouldContinue) {
          console.log("\nThank you for using AVS CLI. Goodbye! 👋\n");
          continueScanning = false;
        }
      }
    }
  } catch (error) {
    displayError(
      `An error occurred: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    process.exit(1);
  }
}

/**
 * Quick scan mode - run scans and exit
 */
async function quickScanMode(
  targetUrl: string,
  allScans: boolean = false,
  cliWordlist?: string
): Promise<void> {
  try {
    // Validate and normalize URL
    if (!isValidUrl(targetUrl)) {
      targetUrl = normalizeUrl(targetUrl);

      if (!isValidUrl(targetUrl)) {
        displayError("Invalid URL format");
        process.exit(1);
      }
    }

    displayHeader("VULNERABILITY SCANNER - QUICK SCAN");
    displayInfo(`Target: ${targetUrl}`);

    let results: ScanResult[];

    if (allScans) {
      const scanOptions = cliWordlist?.trim()
        ? { wordlistPath: cliWordlist.trim() }
        : {};
      results = await runAllScans(targetUrl, scanOptions);
    } else {
      // Run a default set of quick scans
      const quickScans = ["Subdomain Finder", "Network Scanner"];
      const scanOptions = cliWordlist?.trim()
        ? { wordlistPath: cliWordlist.trim() }
        : {};
      results = await runMultipleScans(
        quickScans,
        targetUrl,
        scanOptions
      );
    }

    displayResultsSummary(results);

    // Auto-save in quick mode
    try {
      const filepath = await saveScanReport(targetUrl, results);
      displaySuccess(`Report saved to: ${filepath}`);
    } catch (error) {
      displayError(
        `Failed to save report: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    process.exit(0);
  } catch (error) {
    displayError(
      `Scan failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    process.exit(1);
  }
}

/**
 * Display version and usage information
 */
function showBanner(): void {
  console.log(
    `
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║      AVS CLI - Vulnerability Scanner v1.0.0          ║
  ║                                                       ║
  ║      Comprehensive security scanning tool             ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
    `
  );
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  showBanner();

  const options = parseArguments();

  try {
    if (options.targetUrl) {
      // Quick scan mode
      await quickScanMode(options.targetUrl, options.all || false, options.wordlist);
    } else {
      // Interactive mode
      await interactiveMode();
    }
  } catch (error) {
    displayError(
      `Fatal error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    process.exit(1);
  }
}

// Run the application
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
