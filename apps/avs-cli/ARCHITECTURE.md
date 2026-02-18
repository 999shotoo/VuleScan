# AVS CLI - Architecture & Implementation Guide

## Overview

AVS CLI is a TypeScript-based vulnerability scanner with a modular architecture designed for extensibility and maintainability. This document explains the complete implementation.

## Project Structure

```
avs-cli/
├── src/
│   ├── index.ts              # Main CLI entry point
│   ├── types.ts              # TypeScript interfaces & types
│   ├── config.ts             # Configuration constants
│   ├── utils.ts              # Utility functions
│   ├── scanners.ts           # Scanner module adapters
│   ├── menuSystem.ts         # Interactive menu UI
│   └── fileHandler.ts        # Report file operations
├── dist/                     # Compiled JavaScript (generated)
├── scan-reports/             # Generated scan reports (local)
├── node_modules/             # Dependencies (generated)
├── package.json              # Project metadata & dependencies
├── tsconfig.json             # TypeScript configuration
├── setup.js                  # Setup script
├── README.md                 # Main documentation
├── USAGE_GUIDE.md            # Detailed usage examples
├── ARCHITECTURE.md           # This file
└── .gitignore                # Git ignore rules
```

## File Descriptions

### Core Application Files

#### `src/index.ts` - Main Application
**Purpose:** Entry point for the CLI application

**Key Functions:**
- `parseArguments()` - Parse CLI arguments
- `interactiveMode()` - Interactive menu loop
- `quickScanMode()` - Quick scan without prompts
- `runSingleScan()` - Execute one scanner
- `runMultipleScans()` - Execute multiple scanners
- `runAllScans()` - Execute all available scanners
- `displayResultsSummary()` - Show summary statistics

**Flow:**
1. Show banner
2. Parse arguments
3. Determine mode (interactive vs quick)
4. Execute scans based on user selection
5. Display results and save reports

---

#### `src/types.ts` - Type Definitions
**Purpose:** Centralized TypeScript interfaces

**Key Types:**
```typescript
interface ScanResult {
  name: string;                                // Scanner name
  status: "safe" | "vulnerable";              // Result status
  severity?: "low" | "medium" | "high";       // Risk level
  details?: string;                           // Additional info
}

interface ScanModule {
  name: string;                                // Display name
  description: string;                        // What it does
  scan: (targetUrl: string) => Promise<ScanResult>;  // Scan function
}

interface ScanReport {
  timestamp: string;                          // ISO timestamp
  targetUrl: string;                          // Scanned URL
  scans: ScanResult[];                        // All results
  summary: { total, vulnerable, safe };       // Statistics
}
```

---

#### `src/config.ts` - Configuration
**Purpose:** Centralized configuration and constants

**Key Settings:**
- Timeout values
- Retry settings
- Concurrency limits
- Report directory
- Debug/verbose flags

---

#### `src/utils.ts` - Utility Functions
**Purpose:** Helper functions for common operations

**Categories:**
- **Output Formatting:**
  - `formatResult()` - Color-coded result text
  - `displayResult()` - Print single result
  - `displayHeader()` - Section headers
  - `displaySummary()` - Statistics display

- **URL & Validation:**
  - `isValidUrl()` - Validate URL format
  - `normalizeUrl()` - Add protocol if missing
  - `generateTimestamp()` - Create report timestamp

- **User Feedback:**
  - `displayError()` - Red error message
  - `displaySuccess()` - Green success message
  - `displayInfo()` - Blue info message
  - `showLoadingSpinner()` - Animated loading

---

#### `src/scanners.ts` - Scanner Adapters
**Purpose:** Adapt all module interfaces to standard ScanResult

**Key Components:**
- `scanModules[]` - Array of all available scanners
- Each scanner entry includes name, description, and scan function
- Error handling for each scanner

**Adapter Pattern:**
```typescript
{
  name: "Bruteforce",
  description: "Test service authentication...",
  scan: async (targetUrl) => {
    try {
      const result = await bruteForce(targetUrl);
      // Convert result to ScanResult format
      return { name: "...", status: "...", ... };
    } catch (error) {
      // Handle error gracefully
    }
  }
}
```

---

#### `src/menuSystem.ts` - Interactive UI
**Purpose:** Handle all user interactions using inquirer

**Functions:**
- `showMainMenu()` - Main menu options
- `selectSingleScan()` - Choose one scanner
- `selectMultipleScans()` - Choose multiple scanners
- `confirmAction()` - Yes/no confirmation
- `getTargetUrl()` - Get URL with validation
- `askSaveReport()` - Save results prompt
- `askContinue()` - Another scan prompt
- `showHelp()` - Display help information

**UI Features:**
- Arrow key navigation
- Multi-select with Space/Enter
- Input validation
- Pagination for long lists
- Separators for grouping

---

#### `src/fileHandler.ts` - File Operations
**Purpose:** Handle saving and loading scan reports

**Functions:**
- `saveScanReport()` - Save results to JSON
- `readScanReport()` - Load report from file
- `listScanReports()` - List all reports
- `deleteScanReport()` - Remove report

**Report Format:**
```json
{
  "timestamp": "2024-01-15T10:45:30Z",
  "targetUrl": "https://example.com",
  "scans": [...],
  "summary": { "total": 6, "vulnerable": 2, "safe": 4 }
}
```

---

### Configuration Files

#### `package.json`
- Project metadata
- Dependencies (chalk, inquirer)
- Build/run scripts
- Export configuration

#### `tsconfig.json`
- TypeScript compiler settings
- ES2020 target
- ESNext modules
- Strict mode enabled

#### `.gitignore`
- Exclude node_modules, dist, logs
- Exclude JSON reports
- Common editor files

---

## Execution Flow

### Interactive Mode
```
┌─────────────────────────────────────┐
│     Show Banner & Parse Arguments   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Get Target URL (if not provided)  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│         Show Main Menu (Loop)                   │
├────────────────────────────────────────────────┬┤
│ Single     │ Multiple  │ All       │ Help │Exit│
└─┬──────────┴─┬─────────┴─┬────────┴──────┴────┘
  │            │          │
  ▼            ▼          ▼
[Single]   [Multiple]   [All]
  │      [Selector]      │
  └──────→[Execute Scans]←──
           │
           ▼
      [Display Results]
           │
           ▼
      [Save Report?]
           │
      ┌────┴────┐
      ▼         ▼
   [Save]     [Skip]
      │         │
      └────┬────┘
           ▼
      [Continue?]
       ┌────┴────┐
       ▼         ▼
   [Loop]     [Exit]
```

### Quick Mode
```
┌──────────────────────────────┐
│  Parse Arguments & URL       │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│  Validate & Normalize URL    │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│  Execute Scans (all or set)  │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│  Display Results & Summary   │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│  Save Report (auto)          │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│  Exit                        │
└──────────────────────────────┘
```

## Scan Execution Model

### Single Scanner Execution
```
Scanner.scan(targetUrl)
    │
    ├─→ Load module dynamically
    │
    ├─→ Call module's scan function
    │
    ├─→ Transform result to ScanResult
    │
    └─→ Return standardized result
```

### Multiple Scanner Execution
```
For each selected scanner:
    │
    ├─→ Single Scanner Execution
    │
    ├─→ Display result immediately
    │
    └─→ Add to results array
```

### Error Handling
```
try {
    ├─→ Execute scanner
    │
    └─→ Return result
} catch (error) {
    └─→ Return safe result with error details
        (doesn't stop other scanners)
```

## Extension Points

### Adding a New Scanner

1. **Create Scanner Module** (in `modules/your-scanner/`)
   ```typescript
   export async function scan(targetUrl: string): Promise<ScanResult> {
     // Your implementation
   }
   ```

2. **Add to scanModules** (in `src/scanners.ts`)
   ```typescript
   {
     name: "Your Scanner",
     description: "What it scans for",
     scan: async (targetUrl) => {
       const result = await yourScan(targetUrl);
       return { name: "...", status: "...", ... };
     }
   }
   ```

3. **No changes needed to index.ts** - It automatically picks up new scanners

### Customizing Output

Edit `src/utils.ts`:
- `formatResult()` - Change result formatting
- `displayHeader()` - Customize headers
- Modify colors via chalk

### Adding Menu Options

Edit `src/menuSystem.ts`:
- Add new choice to `showMainMenu()`
- Handle choice in `index.ts` switch statement

## Performance Considerations

### Concurrency
- Currently sequential (one scanner after another)
- Easily modifiable to run scanners in parallel
- See `CONFIG.MAX_CONCURRENT_SCANS`

### Timeout Handling
- Each scan has timeout in `CONFIG.SCAN_TIMEOUT`
- Loading spinner prevents user confusion
- Graceful timeout handling preserves other results

### Memory Usage
- Results stored in memory until saved
- Large reports handled efficiently via JSON streaming
- Report directory cleaned up manually if needed

## Security Considerations

1. **Input Validation**
   - URLs validated before scanning
   - CLI arguments parsed safely
   - File operations use safe paths

2. **Error Handling**
   - No sensitive data in error messages
   - Safe error recovery
   - Detailed logs don't expose internals

3. **Report Privacy**
   - Reports saved locally by default
   - Users control report sharing
   - No external data transmission during scan

4. **Authorization**
   - Tool responsibility to verify permissions
   - Users must authorize target scanning
   - Results display contains guidance

## Testing Strategy

### Unit Tests (Future)
- Utils functions
- Type validation
- URL normalization

### Integration Tests (Future)
- Scanner adapter interface
- Menu system flow
- File operations

### Manual Testing Checklist
- [ ] Single scan execution
- [ ] Multiple scan execution
- [ ] All scans execution
- [ ] Invalid URL handling
- [ ] Report saving/loading
- [ ] Menu navigation
- [ ] Error scenarios

## Deployment

### Building
```bash
npm run build
```
Outputs compiled JavaScript to `dist/`

### Installation
```bash
npm install -g ./
# or
npm link
```

### Distribution
Package as npm module or standalone binary using `pkg` or `esbuild`

## Troubleshooting Guide

### Issue: Module not found
**Cause:** Missing module import or build
**Solution:** Ensure all modules are installed and built

### Issue: Timeout errors
**Cause:** Network or slow target
**Solution:** Increase `SCAN_TIMEOUT` in config

### Issue: Reports not saving
**Cause:** Permission issue
**Solution:** Check `scan-reports/` directory permissions

## Future Enhancements

- [ ] Parallel scanner execution
- [ ] Scan scheduling/cron integration
- [ ] Historical trend analysis
- [ ] Custom scoring system
- [ ] Integration with CVSS
- [ ] Webhook notifications
- [ ] Dashboard UI
- [ ] API server mode
- [ ] Docker containerization
- [ ] Cloud report storage

---

For more information, see:
- [README.md](./README.md) - Main documentation
- [USAGE_GUIDE.md](./USAGE_GUIDE.md) - Usage examples
