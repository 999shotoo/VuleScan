<div align="center">

# 🛡️ VuleScan

**A TypeScript toolkit for offensive security recon — six scanners, one CLI, one desktop app with AI built in.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](apps/cli/package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178C6?logo=typescript&logoColor=white)](tsconfig.json)
[![Turborepo](https://img.shields.io/badge/monorepo-Turborepo-EF4444?logo=turborepo&logoColor=white)](turbo.json)
[![Electron](https://img.shields.io/badge/desktop-Electron-47848F?logo=electron&logoColor=white)](apps/desktop)
[![CLI CI](https://img.shields.io/github/actions/workflow/status/999shotoo/VuleScan/cli-ci.yml?label=CLI%20CI&logo=githubactions&logoColor=white)](.github/workflows/cli-ci.yml)

<img src="https://res.cloudinary.com/dcgzjb6lm/image/upload/v1791069488/WhatsApp_Image_2026-10-04_at_04.45.57_v5we25.jpg" />

[Quick Start](#-quick-start) • [CLI](#-the-vulscan-cli) • [Desktop App](#-the-desktop-app) • [Packages](#-shared-packages) • [Docs](#-documentation)

</div>

---

## 📖 Overview

**VuleScan** bundles six reconnaissance/vulnerability scanners behind two front ends:

| | |
|---|---|
| 🖥️ **`vulscan` CLI** | Globally installable command-line tool. Run all 6 scanners against a target, get a terminal summary or a JSON report. |
| 🪟 **Desktop app** | Electron + React app with a UI for the scanning tools *and* a full multi-provider AI chat assistant (OpenAI, Anthropic, Google). |

Both share the same scanner packages under `packages/`, wired together with **Turborepo**.

> [!WARNING]
> This repo includes active recon and brute-force tooling (port scanning, directory/subdomain enumeration, credential and hash brute-forcing). Only run it against systems and accounts you **own or are explicitly authorized to test**. See [Legal / Responsible Use](#️-legal--responsible-use).

---

## ⚡ Quick Start

```bash
# Clone & install
git clone https://github.com/999shotoo/VuleScan.git
cd VuleScan
npm install

# Build and run the CLI
cd apps/cli && npm run build && npm install -g .
vulscan https://example.com --all
```

```bash
# ...or run the desktop app
cd apps/desktop
cp .env.example .env    # add at least one AI provider key
npm install && npm run dev
```

---

## 🧩 Monorepo Layout

```
VuleScan/
├── apps/
│   ├── cli/                  🖥️  @vulscan/cli — the `vulscan` command
│   ├── desktop/               🪟  Electron + React app (scanner UI + AI chat)
│   ├── docs/                  📄  Next.js docs site (Turborepo starter boilerplate)
│   └── web/                   🌐  Next.js web app (Turborepo starter boilerplate)
├── packages/
│   ├── core/                  🧱  shared types & utilities
│   ├── bruteforce/            🔑  credential / hash brute forcing
│   ├── directory-search/      📂  hidden path discovery
│   ├── encryption-analyzer/   🔐  TLS / hash analysis
│   ├── internet-archive/      🕰️  Wayback Machine mining
│   ├── network-scan/          🌐  TCP port scanning
│   ├── subdomain/             🔎  subdomain enumeration
│   ├── ui/                    🎨  shared React component stubs
│   ├── eslint-config/         🧹  shared ESLint config
│   └── typescript-config/     ⚙️  shared tsconfig bases
├── .github/workflows/cli-ci.yml   build & typecheck the CLI
├── AI_QUICKSTART.md / AI_SETUP_GUIDE.md   desktop AI chat docs
├── turbo.json
└── package.json                npm workspaces root
```

> `apps/docs` and `apps/web` are the unmodified `create-turbo` starter apps — handy as monorepo reference, not part of VuleScan's actual functionality.

---

## 🖥️ The `vulscan` CLI

<div align="center">

```
██╗   ██╗██╗   ██╗██╗     ███████╗███████╗ ██████╗ █████╗ ███╗   ██╗
██║   ██║██║   ██║██║     ██╔════╝██╔════╝██╔════╝██╔══██╗████╗  ██║
██║   ██║██║   ██║██║     █████╗  ███████╗██║     ███████║██╔██╗ ██║
╚██╗ ██╔╝██║   ██║██║     ██╔══╝  ╚════██║██║     ██╔══██║██║╚██╗██║
 ╚████╔╝ ╚██████╔╝███████╗███████╗███████║╚██████╗██║  ██║██║ ╚████║
  ╚═══╝   ╚═════╝ ╚══════╝╚══════╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝
```

</div>

A comprehensive vulnerability scanner CLI, published as **`@vulscan/cli`**, that bundles six scanning tools into one global command.

### Install

```bash
# From source
cd apps/cli
npm run build
npm install -g .
vulscan --version
```

```bash
# Once published
npm install -g @vulscan/cli
```

Requires **Node.js ≥ 18**.

### Usage

```
vulscan [target] [options]
```

| Flag | Description |
|---|---|
| `target` | Target URL or domain, e.g. `https://example.com` |
| `--all` | Run all 6 scanners automatically |
| `--wordlist=<path>` | Custom wordlist for Bruteforce & Directory Search |
| `--json <path>` | Save the report as JSON to the given path |

**Modes:**

- `vulscan` → interactive, step-by-step prompts
- `vulscan https://example.com` → quick scan (Subdomain + Network)
- `vulscan https://example.com --all` → full 6-scanner scan
- `vulscan https://example.com --all --wordlist=./my-wordlist.txt` → full scan, custom wordlist

### 🔍 Scanners

| # | Scanner | Package | What it does |
|:-:|---|---|---|
| 1️⃣ | **Bruteforce** | `@vulscan/bruteforce` | Offline hash cracking (MD5/SHA1/SHA256) + live credential checks over FTP, SSH, Telnet, SMTP, POP3, IMAP, HTTP. Proxy rotation supported. |
| 2️⃣ | **Directory Search** | `@vulscan/directory-search` | Wordlist-based discovery of hidden paths (`/admin`, `/backup`, `/.env`…) with soft-404/wildcard filtering. |
| 3️⃣ | **Encryption Analyzer** | `@vulscan/encryption-analyzer` | TLS/cipher/certificate analysis, hash algorithm detection, dictionary & common-password attacks. |
| 4️⃣ | **Subdomain Finder** | `@vulscan/subdomain` | DNS enumeration (A/AAAA/MX/NS/TXT/SRV/CNAME), permutation brute-force, reverse DNS, zone-transfer checks. |
| 5️⃣ | **Network Scanner** | `@vulscan/network-scan` | TCP port scanning + banner grabbing. `WEB` preset covers 80, 443, 8080, 8443, 8888, 3000, 5000. OS/firewall fingerprinting. |
| 6️⃣ | **Internet Archive** | `@vulscan/internet-archive` | Mines the Wayback Machine (CDX + Wayback APIs) for historically exposed endpoints or leaked data. |

Every scanner reports `SAFE` / `VULNERABLE` with a severity and message:

```diff
+ [✓] Encryption Analyzer — SAFE
      Encryption strength appears strong

- [!] Directory Search — VULNERABLE [MEDIUM]
      Found 3 potentially sensitive directories
```

### 📊 Reports

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

Interactive mode prompts `Save report? (Y/n)` and writes timestamped JSON to `scan-reports/scan-report-<target>-<timestamp>.json`, viewable again via **View Reports**. Default wordlist: `apps/cli/wordlists/common.txt` (~1,200 entries), overridable with `--wordlist`.

<details>
<summary><strong>▶️ Full example session</strong></summary>

```bash
$ vulscan https://testphp.vulnweb.com --all

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

</details>

**Internals:** `src/index.ts` (entry + arg parsing) → `src/commands/menu.ts` (interactive prompts via `inquirer`) → `src/modules/scanModules.ts` (wraps each `@vulscan/*` package into a common `ScanModule`) → `src/utils/` (colored output + JSON report I/O). Bundled to ESM with `tsup`; `inquirer` and `ssh2` stay external at runtime.

---

## 🪟 The Desktop App

An Electron + React app (`apps/desktop`) that wraps the scanners in a UI (see `src/pages/tools/subdomain-finder.tsx`) and ships a full **multi-provider AI chat assistant** on the [Vercel AI SDK](https://ai-sdk.dev).

### 🤖 AI Chat

<table>
<tr><td><strong>OpenAI</strong></td><td>GPT-4o · GPT-4o Mini · GPT-4 Turbo · GPT-3.5 Turbo</td></tr>
<tr><td><strong>Anthropic</strong></td><td>Claude 4 Opus · Claude 4 Sonnet · Claude 3.5 Sonnet · Claude 3.5 Haiku</td></tr>
<tr><td><strong>Google</strong></td><td>Gemini 2.0 Flash · Gemini 1.5 Pro · Gemini 1.5 Flash</td></tr>
</table>

- 📎 **File upload** — images (JPEG/PNG/GIF/WebP) & docs (PDF/TXT/DOC/DOCX), up to 10 MB, drag-and-drop, multi-file
- ⚡ **Streaming** responses via the AI SDK data protocol
- 🔍 **Web search toggle** — mock data by default; see [wiring up a real search API](AI_SETUP_GUIDE.md#implementing-real-web-search)
- 💾 **Local chat history** (`src/lib/chat-storage.ts`)
- 🔌 **MCP support** via `@ai-sdk/mcp` + `config/mcp.config.json`
- 🧩 **AI Elements UI** — conversation view, markdown messages, prompt input with attachments, model selector, reasoning/tool-call displays, code blocks

The Electron main process runs a local [Hono](https://hono.dev) API server (port `3000` by default) so provider keys never leave your machine.

<details>
<summary><strong>▶️ <code>POST /api/chat</code> request shape</strong></summary>

```ts
{
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    parts: Array<{ type: 'text'; text: string }>;
    experimental_attachments?: Array<{
      name: string;
      contentType: string;
      url: string; // base64 data URL or remote URL
    }>;
  }>;
  model: string;      // e.g. "gpt-4o"
  webSearch: boolean; // enable the web search tool
}
```

Returns a streaming response. `GET /api/health` is a basic health check.

</details>

### Configuration

```bash
cp apps/desktop/.env.example apps/desktop/.env
```

```env
# OpenAI    → https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Anthropic → https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Google AI → https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=xxxxxxxxxxxxx

API_PORT=3000
```

> 💡 Google Gemini has a free tier — good for a first run. `.env` is already git-ignored; never commit it.

### Run it

```bash
cd apps/desktop
npm install
npm run dev        # Vite + Electron, API server on :3000

npm run build       # vite build && electron-builder → distributable
```

**Stack:** React 18 · Vite 7 · Tailwind CSS 4 · Radix/Base UI (`shadcn`-style, see `components.json`) · `@xyflow/react` · Framer Motion · Shiki · `streamdown` · `react-router-dom`.

---

## 📦 Shared Packages

| Package | Description |
|---|---|
| `@vulscan/core` | Shared types & utilities used across every scanner. |
| `@vulscan/bruteforce` | Credential/hash brute-force engine — FTP, SSH, Telnet, SMTP, POP3, IMAP, HTTP, MD5/SHA256, proxy support. |
| `@vulscan/directory-search` | Wordlist-based hidden directory/file discovery with soft-404 handling. |
| `@vulscan/encryption-analyzer` | TLS/certificate analysis, hash detection, mutation & dictionary attacks. |
| `@vulscan/internet-archive` | Wayback Machine (CDX + Wayback APIs) historical snapshot search. |
| `@vulscan/network-scan` | TCP port scanning with service/version & banner detection. |
| `@vulscan/subdomain` | DNS-based subdomain enumeration & permutation brute-forcing. |
| `@repo/ui` | Minimal shared React component stubs for the `web`/`docs` starter apps. |
| `@repo/eslint-config` | Shared ESLint configs (base, Next.js, React-internal). |
| `@repo/typescript-config` | Shared `tsconfig.json` bases. |

All `@vulscan/*` packages resolve in the CLI via `@vulscan/* → ../../packages/*/src` and are declared as explicit dependencies in `apps/cli/package.json` for reliable workspace/registry resolution.

---

## 🛠️ Development

### Prerequisites

- Node.js **≥ 18** (CI uses Node 20)
- npm — workspaces + `package-lock.json` are checked in, `packageManager` pinned to `npm@10.9.2`
- PowerShell (`pwsh`), optional, for `setup-ai.ps1`

### Install & build

```bash
git clone https://github.com/999shotoo/VuleScan.git
cd VuleScan
npm install

npm run build          # turbo run build
npm run check-types    # turbo run check-types
npm run lint            # turbo run lint
npm run format           # prettier --write "**/*.{ts,tsx,md}"
```

### Turborepo cheatsheet

```bash
turbo build                               # build everything
turbo build --filter=apps/cli             # build just the CLI
turbo dev                                 # dev mode, everything
turbo dev --filter=vulescan-desktop       # dev mode, desktop app only

npx turbo login && npx turbo link         # optional: Vercel remote caching
```

### CI

[`cli-ci.yml`](.github/workflows/cli-ci.yml) runs on pushes/PRs touching `apps/cli/**`, `packages/**`, or root config — installs deps, builds the CLI, type-checks it on Node 20 / Ubuntu.

---

## 🚀 Publishing the CLI

> Publish only via the team's GitHub Actions workflow with the org `NPM_TOKEN` — **not** a personal npm account.

```bash
npm run build --workspace apps/cli
npm run check-types --workspace apps/cli
npm pack --workspace apps/cli              # optional local validation
npm publish --workspace apps/cli --access public
```

**Release flow:** merge PR → confirm green CI → bump version in `apps/cli/package.json` → tag (`cli-v1.0.6`) → publish via team workflow.

---

## 🩹 Troubleshooting

| Problem | Fix |
|---|---|
| `Module not found` (CLI or desktop) | `npm install` at the repo root — workspaces hoist shared deps. |
| AI chat: `Invalid API key` | Check the key/format in `apps/desktop/.env`, save, restart the app. |
| AI chat: no streaming/response | Confirm the local server is up on port 3000 and a provider key is set. |
| AI chat: image upload fails | Use a vision-capable model, keep files < 10 MB, use a supported type. |
| CLI scan hangs/times out | Lower `concurrency`, raise `timeout`, check your network/proxy. |
| `npm install -g .` fails | Run `npm run build` first so `dist/index.js` exists. |

---

## 📚 Documentation

| File | Covers |
|---|---|
| [`apps/cli/README.md`](apps/cli/README.md) | Full CLI usage, scanner details, sample output, publish flow |
| [`AI_QUICKSTART.md`](AI_QUICKSTART.md) | 3-step guide to the desktop AI chat |
| [`AI_SETUP_GUIDE.md`](AI_SETUP_GUIDE.md) | Full AI chat setup, architecture, customization, cost tips |
| [`ai-elements.md`](ai-elements.md) | AI Elements component reference |
| [`ai-package.md`](ai-package.md) | Vercel AI SDK API reference |

---

## ⚖️ Legal / Responsible Use

VuleScan includes active reconnaissance and brute-force tooling — port scanning, directory/subdomain enumeration, and credential/hash brute-forcing. Only run these scanners against systems and accounts you **own or are explicitly authorized to test**. Unauthorized use may violate computer-misuse laws in your jurisdiction. The Bruteforce Scanner's hash-cracking mode runs offline against a provided hash and doesn't by itself imply a live compromise, but its live-credential checks do contact real services and must only be used with authorization.

## 📄 License

- `apps/cli` / `@vulscan/cli` declares **MIT** in its own `package.json`.
- No repository-wide `LICENSE` file exists yet — add one (MIT, to match the CLI) to cover the whole monorepo unambiguously.
- The desktop AI chat layer bundles the Vercel AI SDK (Apache 2.0), AI Elements (MIT), and individual provider SDKs — check each for its own terms.

---

<div align="center">

Made with 🛡️ by [**999shotoo**](https://github.com/999shotoo)

</div>
