# AVS CLI - Quick Reference

## File Structure Created

```
c:\Users\Yash\Desktop\avs cli\
├── src/                          ← Application source code
│   ├── index.ts                 ← Main CLI application (400+ lines)
│   ├── types.ts                 ← TypeScript interfaces
│   ├── config.ts                ← Configuration constants
│   ├── utils.ts                 ← Utility functions
│   ├── scanners.ts              ← Scanner module adapters
│   ├── menuSystem.ts            ← Interactive menu system
│   └── fileHandler.ts           ← Report file operations
├── package.json                 ← Project dependencies & scripts
├── tsconfig.json                ← TypeScript configuration
├── setup.js                     ← Setup script
├── .gitignore                   ← Git ignore rules
├── README.md                    ← Main documentation
├── USAGE_GUIDE.md               ← Usage examples & workflows
├── ARCHITECTURE.md              ← Technical deep dive
├── IMPLEMENTATION.md            ← Implementation summary
└── modules/                     ← (Existing scanner modules)
    ├── bruteforce/
    ├── directory-search/
    ├── encryption-analyzer/
    ├── internet-archive/
    ├── Network-scan/
    └── subdomain/
```

## Build & Run Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Run the CLI (interactive mode)
npm start

# Quick scan a URL
npx avs-cli https://example.com

# Run all scans on URL
npx avs-cli https://example.com --all
```

## Complete src/ File Summary

### index.ts (400+ lines)
**Main CLI Application**
```
Main Components:
├── parseArguments()           - Parse CLI flags
├── interactiveMode()          - Main interactive loop
├── quickScanMode()            - Quick scan without prompts
├── runSingleScan()            - Execute one scanner
├── runMultipleScans()         - Execute multiple scanners
├── runAllScans()              - Execute all scanners
├── displayResultsSummary()    - Show statistics
└── main()                     - Entry point
```

### types.ts (35 lines)
**Type Definitions**
```
Exports:
├── ScanStatus               - "safe" | "vulnerable"
├── SeverityLevel            - "low" | "medium" | "high"
├── ScanResult               - Standard result interface
├── ScanModule               - Scanner module shape
├── CLIOptions               - Command line options
└── ScanReport               - Complete report structure
```

### config.ts (35 lines)
**Configuration Constants**
```
CONFIG:
├── SCAN_TIMEOUT             - 30000ms
├── HTTP_TIMEOUT             - 5000ms
├── MAX_RETRIES              - 3
├── MAX_CONCURRENT_SCANS     - 3
├── REPORT_DIR               - "./scan-reports"
├── DEBUG                    - From ENV variable
└── USE_PROXY                - From ENV variable

SEVERITY_LEVELS:
├── LOW                      - 1
├── MEDIUM                   - 2
└── HIGH                     - 3
```

### utils.ts (130+ lines)
**Utility Functions**
```
Output Formatting:
├── formatResult()           - Format with colors
├── displayResult()          - Print result
├── displayHeader()          - Section header
├── displaySummary()         - Statistics
├── displayError()           - Error message
├── displaySuccess()         - Success message
└── displayInfo()            - Info message

Validation:
├── isValidUrl()             - Validate URL
├── normalizeUrl()           - Add protocol
└── generateTimestamp()      - Create timestamp

UI:
└── showLoadingSpinner()     - Animated loading
```

### scanners.ts (150+ lines)
**Scanner Module Adapters**
```
scanModules[] Array:
├── Bruteforce Scanner
├── Directory Search
├── Encryption Analyzer
├── Subdomain Finder
├── Network Scanner
└── Internet Archive

Functions:
├── getScannerByName()       - Get by name
├── getAllScannerNames()     - Get all names
└── getScannerDescription()  - Get description
```

### menuSystem.ts (180+ lines)
**Interactive Menu UI**
```
Menu Functions:
├── showMainMenu()           - Main menu choices
├── selectSingleScan()       - Choose one
├── selectMultipleScans()    - Choose multiple
├── confirmAction()          - Yes/no prompt
├── getTargetUrl()           - URL input
├── askSaveReport()          - Save prompt
├── askContinue()            - Continue prompt
└── showHelp()               - Help display
```

### fileHandler.ts (100+ lines)
**Report File Operations**
```
File Functions:
├── saveScanReport()         - Save to JSON
├── readScanReport()         - Load from file
├── listScanReports()        - List all reports
├── deleteScanReport()       - Remove report
└── ensureReportsDir()       - Create directory
```

## Key Features Reference

### ✅ Interactive Menu
```
Main Menu
├── Single Scan
├── Multiple Scans
├── All Scans
├── Help
└── Exit
```

### 🔍 Six Integrated Scanners
1. **Bruteforce Scanner** - Authentication testing
2. **Directory Search** - Hidden directory discovery
3. **Encryption Analyzer** - Encryption strength analysis
4. **Subdomain Finder** - Subdomain enumeration
5. **Network Scanner** - Port & service scanning
6. **Internet Archive** - Historical vulnerability search

### 📊 Output Format
```
✅ Safe Result: safe [severity]
   Details about the scan

⚠️ Vulnerable: vulnerable [severity]
   Details about the finding

Summary:
Total Scans: X
Vulnerable: X
Safe: X
```

### 💾 Report Structure
```
{
  "timestamp": "ISO-8601",
  "targetUrl": "https://...",
  "scans": [
    {
      "name": "Scanner Name",
      "status": "safe|vulnerable",
      "severity": "low|medium|high",
      "details": "..."
    }
  ],
  "summary": {
    "total": X,
    "vulnerable": X,
    "safe": X
  }
}
```

## Extension Guide

### Add New Scanner
1. Add to `scanModules[]` in `src/scanners.ts`:
```typescript
{
  name: "New Scanner",
  description: "What it does",
  scan: async (targetUrl) => {
    // Implementation
    return { name: "...", status: "...", ... };
  }
}
```

2. **That's it!** - No changes needed to index.ts

### Add Menu Option
1. Add choice to `showMainMenu()` in `src/menuSystem.ts`
2. Handle case in switch statement in `src/index.ts`

### Customize Output
Edit functions in `src/utils.ts`:
- Change colors via chalk
- Modify format strings
- Add new display functions

## Dependencies

```json
{
  "chalk": "^5.3.0",      // Terminal colors
  "inquirer": "^9.2.12"   // Interactive prompts
}
```

## NPM Scripts

```json
{
  "build": "tsc",                    // Compile TypeScript
  "dev": "node --loader ts-node/esm",  // Development
  "start": "node dist/index.js",     // Run CLI
  "clean": "rm -rf dist",            // Clean build
  "prepare": "npm run build"         // Pre-publish
}
```

## Environment Variables (Optional)

```bash
DEBUG=true              # Enable debug output
VERBOSE=true            # Enable verbose logging
HTTP_PROXY=...          # Use HTTP proxy
HTTPS_PROXY=...         # Use HTTPS proxy
```

## Error Handling

✅ **Safe Default Behavior:**
- Invalid URLs → Auto-formatted with protocol
- Scanner errors → Don't stop other scanners
- File operations → Graceful fallback
- Timeouts → Loading spinner with message
- Missing data → Descriptive error details

## Testing Checklist

Before deployment:
- [ ] npm install succeeds
- [ ] npm run build completes
- [ ] npm start launches CLI
- [ ] Interactive menu functions
- [ ] Single scan works
- [ ] Multiple scans work
- [ ] All scans work
- [ ] Reports save correctly
- [ ] Invalid URLs handled
- [ ] Error scenarios graceful

## Performance Notes

- **Sequential execution** - Scanners run one after another
- **Easy to parallelize** - See `CONFIG.MAX_CONCURRENT_SCANS`
- **Memory efficient** - Results buffered efficiently
- **Timeout protected** - 30s per scan, configurable
- **Loading feedback** - Spinner prevents idle appearance

## Documentation Files

| File | Purpose |
|------|---------|
| README.md | Main doc with features & usage |
| ARCHITECTURE.md | Technical implementation details |
| USAGE_GUIDE.md | Practical examples & workflows |
| IMPLEMENTATION.md | Summary of what was built |
| QUICK_REFERENCE.md | This file |

## Ready to Use!

✅ All files created and ready to build
✅ Complete TypeScript implementation
✅ Interactive CLI with menu system
✅ 6 integrated scanner modules
✅ Professional error handling
✅ Modular & extensible design
✅ Full documentation included

**Start with:**
```bash
npm install && npm run build && npm start
```

---

Questions? Check the documentation files or review the source code in `src/`
