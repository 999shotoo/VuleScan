# Subdomain Finder

Use this package as a CLI or import it locally in a Node project.

Build

```bash
npm install
npm run build
```

CLI

After building (or installing), run:

```bash
# Basic usage
npx . subdomain.com --http-probe --wordlist=wordlist.txt

# With proxy support
npx . subdomain.com --http-probe --proxy=http://proxy.example.com:8080

# With all options
npx . subdomain.com --http-probe --proxy=http://proxy.example.com:8080 --timeout=5000 --concurrency=20 --wordlist=wordlist.txt
```

Available CLI options:
- `--http-probe`: Enable HTTP/HTTPS probing for found subdomains
- `--proxy=<url>`: Use HTTP/HTTPS proxy (e.g., `http://proxy.example.com:8080` or `http://user:pass@proxy.example.com:8080`)
- `--timeout=<ms>`: Timeout for HTTP requests (default: 2000ms)
- `--concurrency=<num>`: Number of concurrent requests (default: 15)
- `--wordlist=<path>`: Path to wordlist file

Import locally

```ts
// in a TypeScript/Node project
import { findSubdomains } from "../path/to/subdomain";

// Basic usage
const output = await findSubdomains("example.com", { httpProbe: true });

// With proxy support
const output = await findSubdomains("example.com", { 
  httpProbe: true,
  proxyUrl: "http://proxy.example.com:8080"
});

// With all options
const output = await findSubdomains("example.com", {
  httpProbe: true,
  proxyUrl: "http://user:pass@proxy.example.com:8080",
  timeoutMs: 5000,
  concurrency: 20,
  wordlistPath: "wordlist.txt"
});

console.log(output);
```
