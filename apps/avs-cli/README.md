# AVS CLI - Vulnerability Scanner

A comprehensive, TypeScript-based vulnerability scanner CLI with an interactive menu system and modular architecture. Perfect for security assessments, penetration testing, and vulnerability scanning.

**This is a monorepo project** - for detailed information about the monorepo structure and development, see [MONOREPO.md](./MONOREPO.md).

## Features

✨ **Interactive Menu System**
- Single scan selection
- Multiple scan selection
- Run all scans at once
- Beginner-friendly interface

🔒 **Comprehensive Scanning**
- **Bruteforce Scanner** - Test service authentication with wordlist attacks
- **Directory Search** - Scan for hidden directories and files
- **Encryption Analyzer** - Analyze encryption and password strength
- **Subdomain Finder** - Discover subdomains of target domain
- **Network Scanner** - Scan network services and open ports
- **Internet Archive** - Search for historical data and vulnerabilities

📊 **Professional Output**
- ✅ Color-coded results (safe/vulnerable)
- ⚠️ Severity levels (low/medium/high)
- 📈 Summary statistics
- 📑 Timestamped JSON reports

🏗️ **Clean Architecture**
- Modular scanner design
- Easy to extend with new modules
- Proper error handling
- Type-safe TypeScript implementation

## Installation

### Clone and Setup

```bash
# Clone repository
git clone <repo-url>
cd avs-cli

# Install all workspace dependencies
npm install

# Build all packages
npm run build
```

### Individual Module Installation

Each module is published to npm under the `@avs-cli/` scope:

```bash
npm install @avs-cli/bruteforce
npm install @avs-cli/directory-search
npm install @avs-cli/encryption-analyzer
npm install @avs-cli/internet-archive
npm install @avs-cli/network-scan
npm install @avs-cli/subdomain
```

## Monorepo Quick Start

This project uses **npm workspaces** to manage multiple packages:

### Common Commands

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Build specific package
npm run build -w @avs-cli/bruteforce

# Run CLI in development
npm run dev

# Start built CLI
npm run start

# Clean build artifacts
npm run clean

# Run tests
npm run test
```

For complete monorepo documentation, see [MONOREPO.md](./MONOREPO.md).

## Installation (Old style)

## Usage

### Interactive Mode

Start the scanner in interactive mode (default):

```bash
npm start
# or
npx avs-cli
```

This opens an interactive menu where you can:
1. Select a single scan
2. Choose multiple scans
3. Run all scans
4. View help information

### Quick Scan Mode

Scan a specific URL directly:

```bash
npx avs-cli https://example.com
```

Run all scans without interaction:

```bash
npx avs-cli https://example.com --all
```

### Command Line Options

```
npx avs-cli [URL] [OPTIONS]

Arguments:
  URL                Target URL to scan

Options:
  --all              Run all available scans
  --json FILE        Save results to specific JSON file
  --help             Show help information
```

## Output Format

### Individual Result
```
✅ Bruteforce Scanner: safe [LOW]
   Service tested for brute force attacks

⚠️  Directory Search: vulnerable [MEDIUM]
   Found 5 potentially sensitive directories
```

### Summary
```
==================================================
SCAN SUMMARY
──────────────────────────────────────────────────
Total Scans: 6
Vulnerable: 2
Safe: 4
──────────────────────────────────────────────────
```

## Scan Reports

Results are automatically saved to `./scan-reports/` with timestamped filenames:

```
scan-reports/
├── scan-report-example_com-2024-01-15-104530.json
├── scan-report-example_com-2024-01-15-105015.json
└── scan-report-test_com-2024-01-15-110230.json
```

### Report Structure

```json
{
  "timestamp": "2024-01-15T10:45:30.123Z",
  "targetUrl": "https://example.com",
  "scans": [
    {
      "name": "Bruteforce Scanner",
      "status": "safe",
      "severity": "low",
      "details": "Service tested for brute force attacks"
    }
  ],
  "summary": {
    "total": 6,
    "vulnerable": 2,
    "safe": 4
  }
}
```

## Project Structure

```
avs-cli/
├── src/
│   ├── index.ts              # Main CLI application
│   ├── types.ts              # Type definitions
│   ├── utils.ts              # Utility functions
│   ├── scanners.ts           # Scanner adapters
│   ├── menuSystem.ts         # Interactive menu
│   └── fileHandler.ts        # Report saving
├── dist/                     # Compiled JavaScript
├── scan-reports/             # Generated scan reports
└── package.json
```

## Architecture

### Core Components

1. **index.ts** - Main entry point
   - Argument parsing
   - Mode selection (interactive/quick)
   - Main loop orchestration

2. **scanners.ts** - Scanner adapters
   - Wraps all module exports
   - Standardizes ScanResult interface
   - Error handling per scanner

3. **menuSystem.ts** - Interactive UI
   - Menu navigation
   - Input selection
   - Confirmation prompts

4. **utils.ts** - Helper functions
   - URL validation/normalization
   - Output formatting
   - Color management

5. **fileHandler.ts** - Report management
   - Save/load operations
   - Report listing
   - Directory management

### ScanResult Interface

```typescript
interface ScanResult {
  name: string;
  status: "safe" | "vulnerable";
  severity?: "low" | "medium" | "high";
  details?: string;
}
```

## Adding New Scanners

To add a new scanner module:

1. Create your scanner module following the existing pattern
2. Export an async `scan()` function that returns `ScanResult`
3. Add to the `scanModules` array in `src/scanners.ts`:

```typescript
{
  name: "Your Scanner",
  description: "What it does",
  scan: async (targetUrl: string): Promise<ScanResult> => {
    // Implementation
  }
}
```

## Error Handling

The CLI implements comprehensive error handling:

- ❌ Invalid URL detection and auto-correction
- ⚠️ Scanner failure isolation (one scanner failing doesn't stop others)
- 📋 Detailed error messages
- 🔄 Graceful degradation

## Development

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Clean Build

```bash
npm run clean
npm run build
```

## Configuration

### TypeScript Configuration

The project uses strict TypeScript settings in `tsconfig.json`:

- Strict mode enabled
- Source maps enabled
- Module: ESNext
- Target: ES2020

### Supported Node Versions

- Node.js 18.0.0 or higher

## Dependencies

- **chalk** - Terminal colors and styles
- **inquirer** - Interactive command line prompts

## License

MIT

## Security Considerations

⚠️ **Important Security Notes:**

1. **Authorization** - Always get written permission before scanning systems you don't own
2. **Rate Limiting** - Some scans may trigger rate limiting or WAF rules
3. **Legal Compliance** - Follow all applicable laws and regulations
4. **Responsible Disclosure** - Report vulnerabilities responsibly
5. **Network Impact** - Some scans may consume bandwidth; use caution in production

## Troubleshooting

### Reports Not Saving
Ensure `./scan-reports/` directory is writable:
```bash
chmod 755 scan-reports/
```

### Module Import Errors
Ensure all submodules are built:
```bash
cd modules/bruteforce && npm run build
cd modules/directory-search && npm run build
# ... repeat for all modules
```

### URL Validation Issues
The CLI automatically adds `https://` if no protocol is specified:
```bash
npx avs-cli example.com  # Becomes https://example.com
```

## Performance Tips

1. **Subdomain Finder** can be slow for large domains
2. **Directory Search** may timeout on slow connections
3. Run targeted scans instead of all scans for faster results
4. Use quick-scan mode for faster turnaround

## Support

For issues, questions, or feature requests, please check the documentation or contact the maintainers.

---

**Happy Scanning!** 🔍🛡️
