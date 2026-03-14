/**
 * File handling for saving scan reports
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { ScanReport, ScanResult, generateTimestamp } from "@vulscan/core";

let cachedReportsDir: string | null = null;

async function getReportsDir(): Promise<string> {
  if (cachedReportsDir) return cachedReportsDir;

  const moduleFilePath =
    typeof __filename !== "undefined"
      ? __filename
      : fileURLToPath(import.meta.url);
  const __dirname = path.dirname(moduleFilePath);
  // Walk up from dist/ to apps/cli, then use scan-reports/ there
  const cliRoot = path.resolve(__dirname, "..");
  cachedReportsDir = path.join(cliRoot, "scan-reports");
  return cachedReportsDir;
}

function buildStructuredReport(report: ScanReport): string {
  const lines: string[] = [];

  lines.push("AVS CLI SCAN REPORT");
  lines.push("=".repeat(60));
  lines.push(`Generated: ${report.timestamp}`);
  lines.push(`Target: ${report.targetUrl}`);
  lines.push("");
  lines.push("SUMMARY");
  lines.push("-".repeat(60));
  lines.push(`Total Scans : ${report.summary.total}`);
  lines.push(`Vulnerable  : ${report.summary.vulnerable}`);
  lines.push(`Safe        : ${report.summary.safe}`);
  lines.push("");
  lines.push("DETAILED RESULTS");
  lines.push("-".repeat(60));

  report.scans.forEach((scan, index) => {
    lines.push(`${index + 1}. ${scan.name}`);
    lines.push(`   Status   : ${(scan.displayStatus || scan.status.toUpperCase())}`);
    if (scan.severity) {
      lines.push(`   Severity : ${scan.severity.toUpperCase()}`);
    }
    if (scan.details) {
      lines.push(`   Details  : ${scan.details}`);
    }
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * Ensure reports directory exists
 */
async function ensureReportsDir(): Promise<void> {
  try {
    const reportsDir = await getReportsDir();
    await fs.mkdir(reportsDir, { recursive: true });
  } catch (error) {
    console.error("Failed to create reports directory:", error);
  }
}

/**
 * Save scan results to structured text file
 */
export async function saveScanReport(
  targetUrl: string,
  results: ScanResult[]
): Promise<string> {
  await ensureReportsDir();

  const timestamp = generateTimestamp();
  const vulnerable = results.filter((r) => r.status === "vulnerable").length;
  const safe = results.filter((r) => r.status === "safe").length;

  const report: ScanReport = {
    timestamp: new Date().toISOString(),
    targetUrl,
    scans: results,
    summary: {
      total: results.length,
      vulnerable,
      safe,
    },
  };

  const filename = `scan-report-${targetUrl.replace(/[^a-z0-9]/gi, "_")}-${timestamp}.txt`;
  const reportsDir = await getReportsDir();
  const filepath = path.join(reportsDir, filename);

  try {
    await fs.writeFile(filepath, buildStructuredReport(report), "utf-8");
    return filepath;
  } catch (error) {
    throw new Error(
      `Failed to save report: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Read scan report
 */
export async function readScanReport(filepath: string): Promise<ScanReport> {
  try {
    const data = await fs.readFile(filepath, "utf-8");
    if (!data.trim().startsWith("{")) {
      throw new Error("Only legacy JSON reports are supported by readScanReport");
    }
    return JSON.parse(data);
  } catch (error) {
    throw new Error(
      `Failed to read report: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * List all scan reports
 */
export async function listScanReports(): Promise<string[]> {
  try {
    await ensureReportsDir();
    const reportsDir = await getReportsDir();
    const files = await fs.readdir(reportsDir);
    return files
      .filter((f) => f.endsWith(".txt") || f.endsWith(".json"))
      .sort()
      .reverse();
  } catch (error) {
    console.error("Failed to list reports:", error);
    return [];
  }
}

/**
 * Read a report file as plain text
 */
export async function readReportText(filename: string): Promise<string> {
  const reportsDir = await getReportsDir();
  const filepath = path.join(reportsDir, filename);
  return fs.readFile(filepath, "utf-8");
}

/**
 * Delete scan report
 */
export async function deleteScanReport(filename: string): Promise<void> {
  const reportsDir = await getReportsDir();
  const filepath = path.join(reportsDir, filename);
  try {
    await fs.unlink(filepath);
  } catch (error) {
    throw new Error(
      `Failed to delete report: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
