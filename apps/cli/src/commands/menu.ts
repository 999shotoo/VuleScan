/**
 * Interactive menu system for CLI
 */

import inquirer, { Answers, DistinctQuestion } from "inquirer";
import { scanModules } from "../modules/scanModules.js";

/**
 * Display main menu and return user choice
 */
export async function showMainMenu(): Promise<
  "single" | "multiple" | "all" | "start" | "help" | "reports" | "exit"
> {
  console.log("\nVULNERABILITY SCANNER");
  console.log("─".repeat(50));

  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "What would you like to do?",
      choices: [
        { name: "Run a single scan", value: "single" },
        { name: "Run multiple scans", value: "multiple" },
        { name: "Run all scans", value: "all" },
        new inquirer.Separator(),
        { name: "View saved reports", value: "reports" },
        { name: "Help", value: "help" },
        { name: "Exit", value: "exit" },
      ],
    },
  ]);

  return answer.choice;
}

/**
 * Select a saved report from a list
 */
export async function selectReport(reports: string[]): Promise<string | null> {
  const choices: any[] = reports.map((r) => ({ name: r, value: r }));
  choices.push(new inquirer.Separator("──────────────────"));
  choices.push({ name: "← Back", value: "back" });

  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "report",
      message: "Select a report to view:",
      choices,
      pageSize: 12,
    },
  ]);

  return answer.report === "back" ? null : answer.report;
}

/**
 * Get single scan selection
 */
export async function selectSingleScan(): Promise<string> {
  const choices: any = scanModules.map((s) => ({
    name: `${s.name} - ${s.description}`,
    value: s.name,
  }));

  choices.push(new inquirer.Separator("──────────────────"));
  choices.push({ name: "Back to main menu", value: "back" });

  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "scanner",
      message: "Select a scan to run:",
      choices,
      pageSize: 10,
    },
  ]);

  return answer.scanner;
}

/**
 * Get multiple scan selections
 */
export async function selectMultipleScans(): Promise<string[]> {
  const choices = scanModules.map((s) => ({
    name: `${s.name} - ${s.description}`,
    value: s.name,
  }));

  const answer = await inquirer.prompt([
    {
      type: "checkbox",
      name: "scanners",
      message: "Select scans to run (use Space to select, Enter to confirm):",
      choices,
      validate: (selected: string[]) => {
        if (selected.length === 0) {
          return "Please select at least one scan";
        }
        return true;
      },
      pageSize: 10,
    },
  ]);

  return answer.scanners;
}

/**
 * Confirm action before proceeding
 */
export async function confirmAction(message: string): Promise<boolean> {
  const answer = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message,
      default: false,
    },
  ]);

  return answer.confirmed;
}

/**
 * Get target URL with validation
 */
export async function getTargetUrl(defaultUrl?: string): Promise<string> {
  const answer = await inquirer.prompt([
    {
      type: "input",
      name: "url",
      message: "Enter target URL:",
      default: defaultUrl,
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return "URL cannot be empty";
        }
        return true;
      },
    },
  ]);

  return answer.url.trim();
}

/**
 * Ask for optional custom wordlist path
 */
export async function askWordlistPath(defaultPath?: string): Promise<string | undefined> {
  const answer = await inquirer.prompt([
    {
      type: "input",
      name: "wordlistPath",
      message: "Custom wordlist path (optional, press Enter for default):",
      default: defaultPath,
      validate: (input: string) => {
        if (!input) {
          return true;
        }
        if (!input.trim()) {
          return "Path cannot be only spaces";
        }
        return true;
      },
    },
  ]);

  const path = answer.wordlistPath?.trim();
  return path ? path : undefined;
}

/**
 * Ask if user wants to save report
 */
export async function askSaveReport(): Promise<boolean> {
  const answer = await inquirer.prompt([
    {
      type: "confirm",
      name: "save",
      message: "Save scan results to file?",
      default: true,
    },
  ]);

  return answer.save;
}

/**
 * Ask about running another scan
 */
export async function askContinue(): Promise<boolean> {
  const answer = await inquirer.prompt([
    {
      type: "confirm",
      name: "continue",
      message: "Run another scan?",
      default: false,
    },
  ]);

  return answer.continue;
}

/**
 * Show help text
 */
export function showHelp(): void {
  console.log("\nHELP");
  console.log("─".repeat(50));
  console.log("Available Scans:");
  scanModules.forEach((s, index) => {
    console.log(`  ${index + 1}. ${s.name} - ${s.description}`);
  });

  console.log("\nFeatures:");
  console.log("  • Run individual security scans");
  console.log("  • Combine multiple scans");
  console.log("  • Generate detailed reports");
  console.log("  • Save results to JSON files");
  console.log("  • Use custom wordlists for supported modules");
  console.log("  • Simple, beginner-friendly output\n");

  console.log("Output Indicators:");
  console.log("  ✅ Safe - No vulnerabilities found");
  console.log("  ⚠️  Vulnerable - Security issue detected\n");

  console.log("Severity Levels:");
  console.log("  LOW - Minor security concern");
  console.log("  MEDIUM - Should be addressed");
  console.log("  HIGH - Critical vulnerability\n");
}
