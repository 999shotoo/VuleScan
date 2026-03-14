/**
 * Logger utility for CLI output
 */

import { ScanResult } from "@vulscan/core";

/**
 * Format scan results with simple output
 */
export function formatResult(result: ScanResult): string {
  const icon = result.status === "safe" ? "✅" : "⚠️";
  const statusText = result.displayStatus
    ? result.displayStatus
    : result.status === "safe"
      ? "safe"
      : result.status.toUpperCase();
  const severity = result.severity
    ? ` [${result.severity.toUpperCase()}]`
    : "";

  let output = `${icon} ${result.name}: ${statusText}${severity}`;

  if (result.details) {
    output += `\n   ${result.details}`;
  }

  return output;
}

/**
 * Display scan result with proper formatting
 */
export function displayResult(result: ScanResult): void {
  console.log(formatResult(result));
}

/**
 * Display section header
 */
export function displayHeader(title: string): void {
  console.log("\n" + `${"=".repeat(50)}`);
  console.log(title);
  console.log(`${"=".repeat(50)}\n`);
}

/**
 * Display summary statistics
 */
export function displaySummary(
  total: number,
  vulnerable: number,
  safe: number
): void {
  console.log("\nSCAN SUMMARY");
  console.log("─".repeat(50));
  console.log(`Total Scans: ${total}`);
  console.log(`Vulnerable: ${vulnerable}`);
  console.log(`Safe: ${safe}`);
  console.log("─".repeat(50) + "\n");
}

/**
 * Display loading spinner animation
 */
export async function showLoadingSpinner(
  promise: Promise<any>,
  text: string
): Promise<any> {
  const spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let currentFrame = 0;

  const interval = setInterval(() => {
    process.stdout.write(
      `\r${spinner[currentFrame]} ${text}...`
    );
    currentFrame = (currentFrame + 1) % spinner.length;
  }, 80);

  try {
    const result = await promise;
    clearInterval(interval);
    process.stdout.write("\r" + " ".repeat(50) + "\r");
    return result;
  } catch (error) {
    clearInterval(interval);
    process.stdout.write("\r" + " ".repeat(50) + "\r");
    throw error;
  }
}

/**
 * Display error message
 */
export function displayError(message: string): void {
  console.error("❌ ERROR:", message);
}

/**
 * Display success message
 */
export function displaySuccess(message: string): void {
  console.log("✅ SUCCESS:", message);
}

/**
 * Display info message
 */
export function displayInfo(message: string): void {
  console.log("ℹ️  INFO:", message);
}
