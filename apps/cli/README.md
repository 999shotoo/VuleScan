# VuleScan CLI

**A comprehensive TypeScript-based vulnerability scanner CLI** – bundling six security scanning tools into one globally installable command.

---

## Installation

### Local (Development / Global PC Install)
```bash
# From the repo root
cd apps/cli
npm run build
npm install -g .

# Verify with a full scan and JSON output
vulscan https://example.com --all --json scan-reports/cli-smoke
```

### Via npm (published package)
```bash
npm install -g vulscan-cli
```

Verify installed version:
```bash
vulscan --version
```

---

## Usage

```
vulscan [target] [options]
```

| Argument / Flag        | Description                                              |
|------------------------|----------------------------------------------------------|
| `target`               | Target URL or domain (e.g. `https://example.com`)        |
| `--all`                | Run all 6 scanners automatically                         |
| `--wordlist=<path>`    | Custom wordlist file path (for Bruteforce & Directory)   |
| `--wordlist <path>`    | Same as above (space-separated)                          |
| `--json <path>`        | Save output as a JSON report to the given file path      |

## CLI-Only Delivery Checklist

Use this checklist when preparing for push (without deploy/publish):

```bash
# From repo root
npm run build --workspace apps/cli
npm run check-types --workspace apps/cli

# Local global command test
cd apps/cli
npm link
vulscan https://example.com --all --json scan-reports/cli-smoke
```

Expected result:
- CLI runs all 6 scanners
- Summary is shown in terminal
- JSON report is created at the exact `--json` path

## NPM Publish (Later)

Use these steps when you are ready to publish the CLI package to npm.

```bash
# From repo root
npm run build --workspace apps/cli
npm run check-types --workspace apps/cli

# Optional local pack validation
npm pack --workspace apps/cli

# Publish from the CLI workspace
npm publish --workspace apps/cli --access public
```

Notes:
- Package name: `vulscan-cli`
- Global install command after publish: `npm install -g vulscan-cli`

---

## Modes

### 1. Interactive Mode
Prompts you step-by-step — enter target, choose scans, optionally save report.
```bash
vulscan
```

### 2. Quick Scan (single target, default scans)
Runs Subdomain Finder + Network Scanner on the target and exits.
```bash
vulscan https://example.com
```

### 3. Full Scan (all tools)
Runs all 6 scanners against the target.
```bash
vulscan https://example.com --all
```

### 4. Full Scan with Custom Wordlist
```bash
vulscan https://example.com --all --wordlist=./my-wordlist.txt
```

---

## Tools & Sample Outputs

### 1. Bruteforce Scanner
**Description:** Runs offline hash-cracking simulation against provided hashes using a wordlist. This does not imply direct live account compromise.

**Key Parameters:**
- `hash` – MD5/SHA hash to crack
- `algorithm` – Hashing algorithm (`md5`, `sha1`, `sha256`)
- `wordlist` – Path to password wordlist (default: `wordlists/common.txt`)
- `concurrency` – Parallel attempts (default: 2)
- `timeout` – Per-attempt timeout in ms (default: 2000)

**Sample Output (Match Found - Offline):**
```
[!] Bruteforce Scanner — VULNERABLE [HIGH]
    Offline hash matched weak password candidate: "password123"
```

**Sample Output (Safe):**
```
[✓] Bruteforce Scanner — SAFE
    Offline baseline hash did not match tested wordlist entries
```

---

### 2. Directory Search
**Description:** Discovers hidden directories and files on a web server using a wordlist. Tries common paths like `/admin`, `/backup`, `/.env`, etc.

**Key Parameters:**
- `targetUrl` – Full URL of the target (e.g. `https://example.com`)
- `wordlist` – Path to directory wordlist (default: `wordlists/common.txt`)
- `concurrency` – Parallel requests (configurable in engine)

**Sample Output (Potential Exposure):**
```
[!] Directory Search — VULNERABLE [MEDIUM]
    Found 3 potentially sensitive directories
```

**Sample Output (Safe with Soft-404 Filtering):**
```
[✓] Directory Search — SAFE
    No reliable sensitive directories detected (soft-404/wildcard behavior observed)
```

---

### 3. Encryption Analyzer
**Description:** Analyzes the encryption strength of a target URL (SSL/TLS configuration, cipher suites, certificate details).

**Key Parameters:**
- `targetUrl` – URL to analyze (e.g. `https://example.com`)

**Sample Output:**
```
[✓] Encryption Analyzer — SAFE
    Encryption strength appears strong
```

**Sample Output (Weak):**
```
[!] Encryption Analyzer — SAFE
    Encryption strength appears weak
```

---

### 4. Subdomain Finder
**Description:** Discovers subdomains of the target domain using DNS enumeration, permutation brute-force, reverse DNS, nameserver lookup, and zone transfer checks.

**Key Parameters:**
- `domain` – Target domain extracted from URL (e.g. `example.com`)
- DNS query types checked: `A`, `AAAA`, `MX`, `NS`, `TXT`, `SRV`, `CNAME`
- Default concurrency: 15
- Default timeout: 2000ms

**Techniques Used:**
- DNS record enumeration
- Permutation brute-force
- Reverse DNS lookup
- Nameserver lookup
- Zone transfer check

**Sample Output (Subdomains Found):**
```
[!] Subdomain Finder — FOUND
    Discovered subdomains and active web endpoints
```

**Sample Output (None Found):**
```
[✓] Subdomain Finder — SAFE
    No additional subdomains discovered
```

---

### 5. Network Scanner
**Description:** Scans open ports and network services on the target host. Uses WEB preset to check common web-related ports (80, 443, 8080, 8443, etc.).

**Key Parameters:**
- `target` – Hostname extracted from the URL
- `preset` – Scan preset, default: `WEB` (checks ports 80, 443, 8080, 8443, 8888, 3000, 5000)
- Optional: `OS fingerprinting`, `firewall detection`, `script engine`

**Details Reported:**
- Number of open ports
- Live hosts vs. hosts scanned
- Versioned services count
- OS fingerprint guess
- Firewall suspected (yes/no)
- Script engine findings

**Sample Output (Open Ports Found):**
```
[✓] Network Scanner — SAFE
    Open ports: 2; Hosts live: 1/1; Versioned services: 2;
    80/tcp redirects to HTTPS, 443/tcp uses TLS encryption
```

**Sample Output (No Issues):**
```
[✓] Network Scanner — SAFE
    No vulnerable network services detected
```

---

### 6. Internet Archive
**Description:** Searches the Wayback Machine (web.archive.org) for historical snapshots of the target URL and analyzes them for historically exposed vulnerabilities, leaked data, or sensitive endpoints.

**Key Parameters:**
- `targetUrl` – Full URL of the target

**Sample Output (Issues Found):**
```
[!] Internet Archive — VULNERABLE [HIGH]
    Found 7 historical issues
```

**Sample Output (Clean):**
```
[✓] Internet Archive — SAFE
    No historical vulnerabilities detected
```

---

## Scan Summary Output

After all scans complete, a summary is shown:

```
════════════════════════════════════════
  SCAN SUMMARY
════════════════════════════════════════
  Total Scans    : 6
  Vulnerable     : 2
  Safe           : 4
════════════════════════════════════════
  Found 2 potential vulnerability/vulnerabilities.
```

---

## Saving Reports

After any scan, you are prompted:
```
? Save report? (Y/n)
```
If yes, a JSON report is saved to `scan-reports/` with a timestamped filename:
```
scan-reports/scan-report-example.com-2026-03-13T17-30-00.json
```

To view saved reports, use interactive mode → **View Reports** option.

---

## Default Wordlist

Location: `wordlists/common.txt`  
Contains ~1200 common directory names and passwords used by both:
- **Bruteforce Scanner** – password attempts
- **Directory Search** – path discovery

You can override it at runtime:
```bash
vulscan https://target.com --all --wordlist=/path/to/custom.txt
```

---

## Full Example Session

```bash
$ vulscan https://testphp.vulnweb.com --all

  ██╗   ██╗██╗   ██╗██╗     ███████╗███████╗ ██████╗ █████╗ ███╗   ██╗
  ██║   ██║██║   ██║██║     ██╔════╝██╔════╝██╔════╝██╔══██╗████╗  ██║
  ██║   ██║██║   ██║██║     █████╗  ███████╗██║     ███████║██╔██╗ ██║
  ╚██╗ ██╔╝██║   ██║██║     ██╔══╝  ╚════██║██║     ██╔══██║██║╚██╗██║
   ╚████╔╝ ╚██████╔╝███████╗███████╗███████║╚██████╗██║  ██║██║ ╚████║
    ╚═══╝   ╚═════╝ ╚══════╝╚══════╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝

════════════════════════════════════════════
  VULNERABILITY SCANNER - QUICK SCAN
════════════════════════════════════════════
  Target: https://testphp.vulnweb.com

⠋ Running Bruteforce Scanner...
[✓] Bruteforce Scanner — SAFE
    Service resilient to brute force attacks (tested 1024 attempts in 3.1s)

⠋ Running Directory Search...
[!] Directory Search — VULNERABLE [MEDIUM]
    Found 3 potentially sensitive directories

⠋ Running Encryption Analyzer...
[✓] Encryption Analyzer — SAFE
    Encryption strength appears strong

⠋ Running Subdomain Finder...
[✓] Subdomain Finder — SAFE
    No additional subdomains discovered

⠋ Running Network Scanner...
[!] Network Scanner — VULNERABLE [MEDIUM]
    Open ports: 2; Hosts live: 1/1; Versioned services: 1;
    OS: Linux; Firewall: not suspected; Script engine: disabled

⠋ Running Internet Archive...
[✓] Internet Archive — SAFE
    No historical vulnerabilities detected

════════════════════════════════════════
  SCAN SUMMARY
════════════════════════════════════════
  Total Scans    : 6
  Vulnerable     : 2
  Safe           : 4
════════════════════════════════════════
  Found 2 potential vulnerability/vulnerabilities.
```

---

## Project Structure

```
apps/cli/
├── src/
│   ├── index.ts              # CLI entry point, argument parsing, main loop
│   ├── commands/
│   │   └── menu.ts           # Interactive prompts (inquirer)
│   ├── modules/
│   │   └── scanModules.ts    # Wraps all scanner packages into ScanModule[]
│   └── utils/
│       ├── logger.ts         # Colored terminal output helpers
│       └── fileHandler.ts    # JSON report save/load
├── wordlists/
│   └── common.txt            # Default wordlist (bundled in npm package)
├── dist/
│   └── index.js              # Compiled ESM bundle (generated by tsup)
├── tsup.config.ts            # Build config (bundles all @vulscan/* packages)
├── package.json
└── README.md
```

---

## Build & Development

```bash
# Install dependencies (from monorepo root)
npm install

# Build CLI only
cd apps/cli
npm run build

# Install globally on your PC
npm install -g .

# Run directly (no global install)
node dist/index.js https://example.com --all
```

---

## Package Info

| Field       | Value                           |
|-------------|---------------------------------|
| Name        | `vulscan-cli`                   |
| Version     | `1.0.5`                         |
| Node        | >= 18.0.0                       |
| Binary      | `vulscan`                       |
| Format      | ESM (bundled via tsup)          |
| Published   | Via team GitHub workflow (CI)   |

---

## Notes for Team

- **Do NOT publish from a personal npm account.** Publish only via the team's GitHub Actions workflow with the org's npm token.
- The branch `fix/npm-cli-runtime-and-wordlist` contains all runtime bug fixes and is waiting for PR review.
- All `@vulscan/*` workspace packages are bundled into the single `dist/index.js` at build time (no separate installs needed).
- `inquirer` and `ssh2` are listed as external dependencies (installed at runtime from npm, not bundled).

---

## Team Publish Flow (npm)

1. Create and merge PR into the release branch.
2. Ensure CI is green for CLI build and typecheck.
3. Bump version in `apps/cli/package.json`.
4. Create git tag for release (for example `cli-v1.0.6`).
5. Publish via team GitHub workflow using org `NPM_TOKEN`.

Minimal local pre-publish validation:
```bash
npm run build --workspace apps/cli
npm run check-types --workspace apps/cli
node apps/cli/dist/index.js https://example.com --all
```
