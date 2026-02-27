/**
 * Interactive menu system for CLI
 */

import inquirer, { Answers, DistinctQuestion } from "inquirer";
import { scanModules } from "./scanners.js";
import { ScanRunOptions } from "./types.js";

/**
 * Display main menu and return user choice
 */
export async function showMainMenu(): Promise<
  "single" | "multiple" | "all" | "start" | "help" | "exit"
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
        { name: "Help", value: "help" },
        { name: "Exit", value: "exit" },
      ],
    },
  ]);

  return answer.choice;
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

export async function askAdvancedScanOptions(
  scannerNames: string[],
  promptContext?: string
): Promise<ScanRunOptions> {
  const answer = await inquirer.prompt([
    {
      type: "confirm",
      name: "enableAdvanced",
      message: promptContext
        ? `Configure advanced options for ${promptContext}?`
        : "Configure advanced module options?",
      default: false,
    },
  ]);

  if (!answer.enableAdvanced) {
    return {};
  }

  const options: ScanRunOptions = {};

  if (scannerNames.includes("Directory Search")) {
    const directoryAnswers = await inquirer.prompt([
      {
        type: "input",
        name: "threads",
        message: "Directory Search threads:",
        default: 10,
        validate: (input: string) => {
          const n = Number(input);
          return Number.isFinite(n) && n > 0 ? true : "Enter a valid number";
        },
      },
      {
        type: "confirm",
        name: "includeHidden",
        message: "Include hidden file checks?",
        default: true,
      },
      {
        type: "input",
        name: "hiddenEntries",
        message: "Hidden entries (comma-separated, optional):",
        default: ".env,.git,.htaccess",
      },
    ]);

    options.directorySearch = {
      threads: Number(directoryAnswers.threads) || 10,
      includeHidden: !!directoryAnswers.includeHidden,
      hiddenEntries: String(directoryAnswers.hiddenEntries || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    };
  }

  if (scannerNames.includes("Network Scanner")) {
    const networkAnswers = await inquirer.prompt([
      {
        type: "list",
        name: "scanType",
        message: "Network scan type:",
        choices: ["TCP_CONNECT", "FAST_CONNECT", "SERVICE_DETECT"],
        default: "SERVICE_DETECT",
      },
      {
        type: "confirm",
        name: "hostDiscovery",
        message: "Enable host discovery?",
        default: true,
      },
      {
        type: "confirm",
        name: "versionDetection",
        message: "Enable version detection?",
        default: true,
      },
      {
        type: "confirm",
        name: "osDetection",
        message: "Enable OS detection?",
        default: true,
      },
      {
        type: "confirm",
        name: "networkMapping",
        message: "Enable network mapping?",
        default: true,
      },
      {
        type: "confirm",
        name: "firewallDetection",
        message: "Enable firewall detection?",
        default: true,
      },
      {
        type: "input",
        name: "scripts",
        message: "Script engine scripts (comma-separated, or 'none' to disable):",
        default: "default,banner-check",
      },
    ]);

    const rawScripts = String(networkAnswers.scripts || "").trim();
    const disableScriptEngine = ["n", "no", "none", "off", "false"].includes(
      rawScripts.toLowerCase()
    );

    options.networkScan = {
      scanType: networkAnswers.scanType,
      hostDiscovery: !!networkAnswers.hostDiscovery,
      versionDetection: !!networkAnswers.versionDetection,
      osDetection: !!networkAnswers.osDetection,
      networkMapping: !!networkAnswers.networkMapping,
      firewallDetection: !!networkAnswers.firewallDetection,
      scriptEngine: !disableScriptEngine,
      scripts: disableScriptEngine
        ? []
        : rawScripts
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
    };
  }

  if (scannerNames.includes("Bruteforce")) {
    const bruteforceAnswers = await inquirer.prompt([
      {
        type: "list",
        name: "mode",
        message: "Bruteforce mode:",
        choices: ["hash", "ssh", "http", "ftp", "smtp", "pop3", "imap", "telnet"],
        default: "hash",
      },
      {
        type: "list",
        name: "attack",
        message: "Credential attack strategy:",
        choices: ["credential", "password-spray", "username-spray"],
        default: "credential",
      },
      {
        type: "input",
        name: "threads",
        message: "Bruteforce threads:",
        default: 4,
        validate: (input: string) => {
          const n = Number(input);
          return Number.isFinite(n) && n > 0 ? true : "Enter a valid number";
        },
      },
    ]);

    options.bruteforce = {
      mode: bruteforceAnswers.mode,
      attack: bruteforceAnswers.attack,
      threads: Number(bruteforceAnswers.threads) || 4,
    };
  }

  if (scannerNames.includes("Subdomain Finder")) {
    const subdomainAnswers = await inquirer.prompt([
      {
        type: "input",
        name: "queryTypes",
        message: "DNS query types (comma-separated):",
        default: "A,AAAA,MX,NS,TXT,SRV,CNAME",
      },
      {
        type: "confirm",
        name: "reverseLookup",
        message: "Enable reverse lookup?",
        default: true,
      },
      {
        type: "confirm",
        name: "zoneTransferCheck",
        message: "Enable zone transfer check?",
        default: true,
      },
    ]);

    options.subdomain = {
      queryTypes: String(subdomainAnswers.queryTypes || "")
        .split(",")
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean),
      reverseLookup: !!subdomainAnswers.reverseLookup,
      zoneTransferCheck: !!subdomainAnswers.zoneTransferCheck,
    };
  }

  return options;
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
  console.log("  • Configure advanced options per scanner in interactive mode");
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
