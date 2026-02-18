# Example Usage Guide

This document provides practical examples of using AVS CLI for different scenarios.

## Basic Usage

### Start Interactive Mode
```bash
npm start
```

Then navigate through the menu using arrow keys and Enter.

### Quick Scan a URL
```bash
npx avs-cli https://example.com
```

### Run All Scans
```bash
npx avs-cli https://example.com --all
```

## User Workflows

### Scenario 1: Security Audit of Single Service
1. Start CLI: `npm start`
2. Enter target URL: `https://api.example.com`
3. Select "Run all scans"
4. Wait for completion
5. Choose to save report
6. Review `scan-reports/scan-report-*.json`

### Scenario 2: Quick Initial Assessment
```bash
npx avs-cli https://example.com
```
- Runs Subdomain Finder and Network Scanner
- Quick overview of basic vulnerabilities
- Auto-saves report

### Scenario 3: Focused Vulnerability Check
1. Start CLI: `npm start`
2. Enter target URL
3. Select "Run multiple scans"
4. Choose specific scanners:
   - Encryption Analyzer
   - Directory Search
5. Review results

### Scenario 4: Ongoing Security Monitoring
```bash
#!/bin/bash
# Run weekly scans
npx avs-cli https://example.com --all > logs/scan-$(date +%Y%m%d).log
```

## Interactive Menu Flow

```
Start
  ↓
Enter Target URL
  ├─→ Single Scan
  │     └─→ Select Scanner
  │           └─→ View Results
  │
  ├─→ Multiple Scans
  │     └─→ Select Scanners (multi-select)
  │           └─→ View Results
  │
  ├─→ All Scans
  │     └─→ Confirm
  │           └─→ View Results
  │
  ├─→ Help
  │     └─→ View Available Scanners
  │
  ├─→ Exit
  └─→ Continue?
        ├─→ New Scan
        └─→ Exit
```

## Reading Reports

### View Latest Report
```bash
cat scan-reports/$(ls -t scan-reports/*.json | head -1)
```

### Parse Specific Information
```bash
# Get vulnerable services from report
jq '.scans[] | select(.status=="vulnerable")' scan-reports/scan-report-*.json

# Get vulnerability count
jq '.summary' scan-reports/scan-report-*.json
```

### Filter by Severity
```bash
# Get all high severity vulnerabilities
jq '.scans[] | select(.severity=="high")' scan-reports/scan-report-*.json
```

## Interpreting Results

### Status Indicators
- ✅ **Safe** - No vulnerabilities detected in this scan
- ⚠️ **Vulnerable** - Potential security issue found

### Severity Levels
- **LOW** - Minor concern, low security impact
- **MEDIUM** - Should be addressed, moderate risk
- **HIGH** - Critical, immediate attention required

### Example Result
```
⚠️  Directory Search: vulnerable [MEDIUM]
   Found 5 potentially sensitive directories
```

This means:
- Scanner: Directory Search
- Status: Vulnerable
- Severity: Medium priority
- Details: 5 sensitive directories were discovered

## Troubleshooting

### Issue: "Invalid URL format"
**Solution:** Ensure URL includes protocol or domain:
```bash
✗ npx avs-cli localhost          # Invalid
✓ npx avs-cli localhost:3000     # Valid
✓ npx avs-cli https://example.com # Valid
```

### Issue: Scan hangs or times out
**Solution:** Use quick scan or specific scanners:
```bash
# Instead of all scans
npx avs-cli https://slow-site.com

# Run single fast scanner
npm start  # Select single Subdomain Finder
```

### Issue: "Scan data unavailable"
**Solution:** This doesn't break the scan, other scanners continue. Check:
1. Internet connection
2. Target URL accessibility
3. Rate limiting (wait and retry)

### Issue: Reports not saved
**Solution:** Check directory permissions:
```bash
ls -la scan-reports/
chmod 755 scan-reports/
```

## Integration with Other Tools

### Export to CSV
```javascript
// Create scan-to-csv.js
import fs from 'fs';
const report = JSON.parse(fs.readFileSync('scan-reports/latest.json', 'utf8'));
const csv = report.scans.map(s => 
  `${s.name},${s.status},${s.severity || 'N/A'},${s.details || 'N/A'}`
).join('\n');
console.log(csv);
```

### Slack Notification
```javascript
// Create slack-notify.js
const report = JSON.parse(fs.readFileSync('latest.json', 'utf8'));
const high_severity = report.scans.filter(s => s.severity === 'high');

// Send to Slack webhook...
```

### CI/CD Integration
```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on: [push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build
      - run: npx avs-cli https://staging.example.com --all
      - uses: actions/upload-artifact@v2
        with:
          name: scan-reports
          path: scan-reports/
```

## Best Practices

1. **Run Full Scans Regularly**
   - At least weekly for production systems
   - After major updates
   - Before deployments

2. **Monitor Results Over Time**
   - Compare reports to detect degradation
   - Track remediation progress
   - Document changes

3. **Act on Findings**
   - High severity issues: immediate
   - Medium severity: address within sprint
   - Low severity: backlog

4. **Secure Your Reports**
   - Don't commit to version control
   - Store in secure location
   - Encrypt if needed

5. **Test in Staging First**
   - Verify scanner compatibility
   - Check for rate limiting
   - Estimate scan duration

## Advanced Configuration

### Environment Variables
```bash
# Enable debug output
export DEBUG=true

# Enable verbose logging
export VERBOSE=true

# Use proxy
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080

# Run CLI
npm start
```

### Custom Timeout Settings
Edit `src/config.ts`:
```typescript
export const CONFIG = {
  SCAN_TIMEOUT: 60000,  // 60 seconds
  HTTP_TIMEOUT: 10000,  // 10 seconds
  // ...
};
```

---

For more information, see [README.md](./README.md)
