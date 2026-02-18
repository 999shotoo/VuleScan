# network-scan

Production-ready TCP port scanner with banner grabbing & OS fingerprinting. Designed for ethical and defensive security testing.

## Features

- TCP Connect scanning
- Banner grabbing for service/version info
- OS fingerprinting (Windows/Unix guess)
- Vulnerability hints (no exploitation)
- Structured JSON output for automation
- Usable as CLI or library

## Usage

### CLI

```bash
npx network-scan <host> [options]
```

#### Options

- `--preset=PRESET` (TOP_100|TOP_1000|WEB|DATABASE|MAIL|ALL, default: TOP_100)
- `--ports=80,443,8080` (Comma-separated custom port list)
- `--timeout=2000` (Timeout in ms, default: 2000)
- `--concurrency=10` (Concurrent scans, default: 10, max: 100)
- `--proxy=<url>` (Single proxy server URL, e.g., http://proxy.example.com:8080 or socks5://proxy:1080)
- `--use-builtin-proxy` (Use the built-in proxy configuration)
- `--proxy-list=<file>` (Path to proxy list file for rotation)
- `--check-vulns` (Show vulnerability hints)
- `--help` (Show usage)

#### Examples

```bash
# Basic scan (Mode 1: Without proxy)
npx network-scan example.com

# Mode 2: Built-in proxy
npx network-scan example.com --use-builtin-proxy

# Mode 3: Proxy list with rotation
npx network-scan example.com --proxy-list=proxies.txt

# Single custom proxy (alternative to built-in)
npx network-scan example.com --proxy=http://proxy.example.com:8080

# Scan with SOCKS5 proxy
npx network-scan example.com --proxy=socks5://proxy.example.com:1080

# Custom ports with proxy list
npx network-scan example.com --ports=22,80,443 --proxy-list=proxies.txt --timeout=3000

# Preset scan with concurrency and built-in proxy
npx network-scan example.com --preset=WEB --concurrency=5 --use-builtin-proxy
```

#### Output

- JSON only (no console noise)
- Stable schema: suitable for piping to files, scripts, CI pipelines

### Library/API

```typescript
import { scanNetwork, ProxyConfig, ProxyListConfig, parseProxyListFile, BUILTIN_PROXY } from "network-scan";

// Mode 1: Basic scan without proxy
const result = await scanNetwork("example.com", {
  ports: [80, 443, 22],
  timeoutMs: 1000,
  concurrency: 5,
  checkVulns: true
});

// Mode 2: Scan with built-in proxy
const resultWithBuiltin = await scanNetwork("example.com", {
  ports: [80, 443, 22],
  timeoutMs: 1000,
  concurrency: 5,
  proxy: "builtin"
});

// Mode 3: Scan with proxy list
const proxies = parseProxyListFile("proxies.txt");
const resultWithList = await scanNetwork("example.com", {
  ports: [80, 443, 22],
  timeoutMs: 1000,
  concurrency: 5,
  proxy: {
    proxies,
    rotationStrategy: "round-robin" // or "random" or "sequential"
  }
});

// Alternative: Single custom proxy
const proxyConfig: ProxyConfig = {
  host: "proxy.example.com",
  port: 8080,
  type: "http"
};

const resultWithProxy = await scanNetwork("example.com", {
  ports: [80, 443, 22],
  timeoutMs: 1000,
  concurrency: 5,
  proxy: proxyConfig
});

// result: JSON object (see ScanResult schema)
```

## Defensive Defaults

- Timeouts, concurrency caps enforced
- No exploitation, only info hints

## Proxy Support

The scanner supports three proxy modes for flexible network configuration:

### 1. Without Proxy (Default)
No proxy flags needed. Direct connection to target.

```bash
npx network-scan example.com
```

### 2. Built-in Proxy
Use the pre-configured proxy with `--use-builtin-proxy` flag. The built-in proxy is defined in the code and can be customized for your organization.

```bash
npx network-scan example.com --use-builtin-proxy
```

### 3. Proxy List from File
Provide a file containing multiple proxies for automatic rotation. The scanner will rotate through proxies using a round-robin strategy.

```bash
npx network-scan example.com --proxy-list=proxies.txt
```

**Proxy list file format** (see `proxies-example.txt`):
```
# Lines starting with # are comments
http://proxy1.example.com:8080
http://proxy2.example.com:3128
socks5://socks-proxy.example.com:1080
https://secure-proxy.example.com:443
http://user:pass@proxy-with-auth.example.com:8080
```

### Supported Proxy Types

- **HTTP/HTTPS**: Uses CONNECT method for tunneling
- **SOCKS5**: Direct proxy protocol support (via URL specification)

### Single Proxy Configuration (Alternative)

You can also specify a single custom proxy using `--proxy=<url>`:

```bash
# With credentials
npx network-scan example.com --proxy=http://username:password@proxy.example.com:8080
```

## Defensive Defaults

- Timeouts, concurrency caps enforced
- No exploitation, only info hints

## License

MIT
