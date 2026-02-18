# Installation & Setup Guide

## Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher
- TypeScript knowledge (basic level)

## Step-by-Step Setup

### 1. Navigate to Project Directory

```powershell
cd "C:\Users\Yash\Desktop\modules\internet-archive"
```

### 2. Install Dependencies

```powershell
npm install
```

This will install:
- `axios` - For HTTP requests to Archive APIs
- `pino` - For structured logging
- TypeScript and development tools

### 3. Verify Installation

```powershell
npm run build
```

You should see no errors and a `dist/` folder should be created.

## Configuration

### Environment Setup (Optional)

Create a `.env` file for any custom configuration:

```env
# API Configuration
ARCHIVE_API_TIMEOUT=30000
LOG_LEVEL=info

# Scanner Configuration
MAX_SCAN_RESULTS=10000
ENABLE_PAGINATION=false

# Security
SECURE_LOGGING=true
```

### TypeScript Configuration

The project uses strict TypeScript settings. To customize:

Edit `tsconfig.json` for compilation options.

## Building & Running

### Development Mode

Watch files and rebuild automatically:

```powershell
npm run dev
```

### Production Build

```powershell
npm run build
```

Output will be in `dist/` folder.

### Run Basic Example

```powershell
# First compile
npm run build

# Then run with Node
node -r ts-node/register src/examples.ts
```

## Usage

### In Your Project

```typescript
// Import the scanner
import { InternetArchiveVulnerabilityScanner } from './src/index';

// Create instance
const scanner = new InternetArchiveVulnerabilityScanner({
  log_level: 'info'
});

// Scan a URL
const result = await scanner.scan('example.com');

// View results
console.log(result);
```

### Command Line (Create a test file)

Create `test-scan.ts`:

```typescript
import { InternetArchiveVulnerabilityScanner } from './src/index';

async function main() {
  const scanner = new InternetArchiveVulnerabilityScanner();
  
  try {
    console.log('Starting scan...');
    const result = await scanner.scan('github.com', {
      checkCriticalStatusCodes: true,
      checkExposedEndpoints: true,
    });
    
    console.log('Scan Complete!');
    console.log(result);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

Then run:
```powershell
npx ts-node test-scan.ts
```

## Testing

### Run Test Suite

```powershell
npm run test
```

### Lint Code

```powershell
npm run lint
```

## Troubleshooting

### Issue: npm install fails

**Solution**: 
```powershell
# Clear npm cache
npm cache clean --force

# Try again
npm install
```

### Issue: TypeScript compilation errors

**Solution**:
```powershell
# Verify Node/npm versions
node --version
npm --version

# Clear cache
npm cache clean --force
rm -r node_modules
npm install
```

### Issue: Cannot find module 'axios'

**Solution**:
```powershell
# Reinstall specific package
npm install axios

# Or reinstall all
npm install
```

### Issue: API timeout errors

**Solution**: Increase timeout in config:
```typescript
const scanner = new InternetArchiveVulnerabilityScanner({
  timeout: 60000  // 60 seconds instead of default 30
});
```

## Performance Tuning

### For Large-Scale Scans

```typescript
const scanner = new InternetArchiveVulnerabilityScanner({
  max_results: 5000,        // Reduce if memory constrained
  enable_pagination: true,  // Enable for large domains
  timeout: 45000,           // Increase for slow connections
});
```

### Memory Optimization

Scan URLs one at a time instead of batch:

```typescript
const urls = ['site1.com', 'site2.com', 'site3.com'];

for (const url of urls) {
  const result = await scanner.scan(url);
  // Process result immediately
  // Don't keep large result arrays in memory
}
```

## Integration with Other Tools

### With Express.js Server

```typescript
import express from 'express';
import { InternetArchiveVulnerabilityScanner } from './src/index';

const app = express();
const scanner = new InternetArchiveVulnerabilityScanner();

app.post('/scan', async (req, res) => {
  try {
    const { url } = req.body;
    const result = await scanner.scan(url);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

### With PM2 (Production)

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'ia-scanner',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    }
  }]
};
```

Then run:
```powershell
pm2 start ecosystem.config.js
```

### With Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

Build and run:
```powershell
docker build -t ia-scanner .
docker run ia-scanner
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/scan.yml`:

```yaml
name: Vulnerability Scan

on:
  schedule:
    - cron: '0 2 * * 1'  # Weekly Monday scan

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: 18
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npm run build
      - name: Run scan
        run: npm run test
```

## Updating the Module

### Check for Updates

```powershell
npm outdated
```

### Update Dependencies

```powershell
npm update
```

### Update to Latest Major Version

```powershell
npm install @vulnerability-scanner/internet-archive@latest
```

## Important Notes

1. **API Rate Limiting**: Internet Archive limits requests. Add delays between scans.
2. **Authorization**: Only scan URLs you own or have permission to scan.
3. **Network**: Requires internet connection to reach Archive APIs.
4. **Performance**: Large scans may take several minutes.
5. **Results**: Store reports securely with restricted access.

## Getting Help

### Check Documentation

1. **README.md** - Full API documentation
2. **QUICKSTART.md** - Quick start examples
3. **ADVANCED.md** - Advanced patterns
4. **SECURITY.md** - Security guidelines

### Check Examples

Look at `src/examples.ts` for usage patterns.

### Debug Issues

Enable debug logging:

```typescript
const scanner = new InternetArchiveVulnerabilityScanner({
  log_level: 'debug'  // Show all debug messages
});
```

## Success Checklist

- ✅ Node.js and npm installed
- ✅ Dependencies installed (`npm install`)
- ✅ Project built successfully (`npm run build`)
- ✅ No TypeScript errors
- ✅ Can import the module
- ✅ First test scan works

## Next Steps

1. Read **README.md** for complete documentation
2. Follow **QUICKSTART.md** for first scan
3. Review **ADVANCED.md** for advanced features
4. Check **SECURITY.md** for security best practices
5. Integrate into your workflow

---

**You're all set!** 🚀 

Start scanning with:
```powershell
npm run dev
```
