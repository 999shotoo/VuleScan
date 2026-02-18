# CLI Usage Guide

## 🚀 Quick Start

```powershell
# Get help
node dist/cli.js --help

# View configuration
node dist/cli.js --config

# Basic scan
node dist/cli.js example.com

# Scan with date range
node dist/cli.js example.com --from=20200101 --to=20231231

# Search for vulnerable endpoints
node dist/cli.js example.com --endpoints=/admin,/wp-admin,/.env

# Get historical snapshots
node dist/cli.js example.com --snapshots

# Analyze configuration changes
node dist/cli.js example.com --changes

# Export to JSON
node dist/cli.js example.com --output=json --file=results.json

# Verbose mode (debug info)
node dist/cli.js example.com --verbose
```

## 📊 Available Commands

### Full Vulnerability Scan (Default)
```powershell
node dist/cli.js example.com
```
Detects:
- Critical HTTP status codes (401, 403, 500, 502, 503)
- Exposed endpoints (/admin, /wp-admin, /.env, etc.)
- Configuration changes
- Historical vulnerabilities

### Search Vulnerable Endpoints
```powershell
node dist/cli.js example.com --endpoints=/admin,/wp-admin,/phpmyadmin,/.env
```
Find exposed:
- Admin panels
- Configuration files
- Database tools
- Repository data

### Analyze Configuration Changes
```powershell
node dist/cli.js example.com --changes
```
Shows:
- Content modifications over time
- Unusual changes
- Suspicious patterns

### Retrieve Historical Snapshots
```powershell
node dist/cli.js example.com --snapshots --from=20200101 --to=20231231
```
Lists:
- All captures in date range
- HTTP status codes
- Content types
- Timestamps

## 🎯 Real-World Examples

### 1. Scan Your Company Website
```powershell
node dist/cli.js mycompany.com
```

### 2. Find Exposed Admin Pages
```powershell
node dist/cli.js mycompany.com --endpoints=/admin,/administrator,/wp-admin
```

### 3. Check 2022 Vulnerability History
```powershell
node dist/cli.js oldservice.com --from=20220101 --to=20221231 --verbose
```

### 4. Export Detailed Report
```powershell
node dist/cli.js example.com --output=json --file=report.json
```

### 5. Find All Changes
```powershell
node dist/cli.js example.com --changes --output=text
```

### 6. CSV Export (Findings Only)
```powershell
node dist/cli.js example.com --output=csv --file=findings.csv
```

## 📋 Command Options

| Option | Usage | Example |
|--------|-------|---------|
| `<url>` | **Required** - Target URL or domain | `example.com` |
| `--from` | Start date (YYYYMMDD) | `--from=20200101` |
| `--to` | End date (YYYYMMDD) | `--to=20231231` |
| `--endpoints` | Comma-separated endpoints | `--endpoints=/admin,/.env` |
| `--output` | Format: text, json, csv | `--output=json` |
| `--file` | Save to file | `--file=results.json` |
| `--changes` | Analyze config changes | `--changes` |
| `--snapshots` | Get snapshots only | `--snapshots` |
| `--verbose` | Debug output | `--verbose` |
| `--config` | Show config | `--config` |
| `--help` | Show help | `--help` |

## 📤 Output Formats

### Text (Default)
```
═════════════════════════════════
📊 SCAN RESULTS - github.com
═════════════════════════════════

⏰ Scan Date: 2024-02-15T10:30:00Z
📦 Total Captures: 250
🚨 Total Findings: 5
📈 Risk Level: HIGH

📋 Summary by Severity:
  🔴 CRITICAL: 1
  🟠 HIGH: 2
  🟡 MEDIUM: 2

🔍 Top Findings:
  1. [CRITICAL] exposed_endpoint
     URL: https://github.com/admin
     ...
```

### JSON
```powershell
node dist/cli.js example.com --output=json --file=results.json
```

Produces structured JSON with full details, suitable for:
- Parsing by other tools
- Storing in databases
- Integration with monitoring systems

### CSV
```powershell
node dist/cli.js example.com --output=csv --file=findings.csv
```

Produces comma-separated values with columns:
- URL
- Severity
- Type
- Timestamp
- Status Code
- Description

## 🔍 Performance Tips

1. **Use Date Ranges**: Narrows results
   ```powershell
   node dist/cli.js example.com --from=20230101 --to=20230131
   ```

2. **Verbose Mode for Details**:
   ```powershell
   node dist/cli.js example.com --verbose
   ```

3. **Save Results**:
   ```powershell
   node dist/cli.js example.com --file=results.json --output=json
   ```

4. **Check Config**:
   ```powershell
   node dist/cli.js --config
   ```

## 🛡️ Security Notes

✅ **Always**:
- Only scan domains you own or have permission to scan
- Review SECURITY.md for guidelines
- Store reports securely

❌ **Never**:
- Scan unauthorized URLs
- Share findings publicly
- Exploit discovered vulnerabilities

## 🆘 Troubleshooting

### Timeout Errors
- The API query took too long (common for large domains)
- Solution: Use date ranges to limit results

### No Results
- URL may not be archived in Wayback Machine
- Try without date restrictions first
- Check manually: https://web.archive.org/web/*/example.com

### Large Result Sets
- Use `--from` and `--to` to narrow the search
- Reduce `max_results` in config if needed

## 📚 Quick Reference

```powershell
# View help anytime
node dist/cli.js --help

# Check current config
node dist/cli.js --config

# Simple scan
node dist/cli.js github.com

# With options
node dist/cli.js github.com --from=2023 --output=json --file=report.json

# Find exposed files
node dist/cli.js example.com --endpoints=/.env,/config.php,database.yml
```

## 🎓 Learning Path

1. **Start**: `node dist/cli.js --help`
2. **Try**: `node dist/cli.js example.com`
3. **Explore**: `node dist/cli.js example.com --verbose`
4. **Export**: `node dist/cli.js example.com --output=json --file=report.json`
5. **Advanced**: Mix and match options

## 📞 Need Help?

- Check all options: `node dist/cli.js --help`
- View config: `node dist/cli.js --config`  
- See docs: `README.md`, `SECURITY.md`, `ADVANCED.md`

---

**Ready to scan! 🚀**

```powershell
node dist/cli.js [your-domain]
```
