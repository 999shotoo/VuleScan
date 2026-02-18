# AVS CLI Monorepo Structure

This is a monorepo project managing multiple security scanning modules using npm workspaces.

## Project Structure

```
avs-cli-monorepo/
├── packages/
│   └── core/              # Main CLI entry point and menu system
├── modules/
│   ├── bruteforce/        # Brute force attack module
│   ├── directory-search/  # Directory brute-force scanner
│   ├── encryption-analyzer/ # Hash & encryption analysis
│   ├── internet-archive/  # Wayback Machine integration
│   ├── Network-scan/      # Network & port scanner
│   └── subdomain/         # Subdomain discovery
├── scan-reports/          # Output directory for scan results
└── src/                   # Root src (if using root package)
```

## Package Structure

Each workspace package follows this structure:
```
<package>/
├── src/                   # TypeScript source code
│   ├── index.ts          # Main export
│   ├── cli.ts            # CLI entry point (if applicable)
│   └── ...modules/
├── dist/                 # Compiled JavaScript (generated)
├── package.json          # Package configuration
└── tsconfig.json        # TypeScript configuration
```

## Working with the Monorepo

### Installation

Install all dependencies for all workspaces:
```bash
npm install
```

### Building

Build all packages:
```bash
npm run build
```

Build only core package:
```bash
npm run build:core
```

Build only modules:
```bash
npm run build:modules
```

Build a specific workspace:
```bash
npm run build -w @avs-cli/bruteforce
```

### Development

Start the main CLI in development mode:
```bash
npm run dev
```

Watch and rebuild a specific module:
```bash
npm run build -w @avs-cli/directory-search -- --watch
```

### Running

Start the built CLI:
```bash
npm run start
```

Or use the installed binary:
```bash
avs-cli
```

## Package Publishing

Each module is published as a scoped package under `@avs-cli/`:

- `@avs-cli/core` - Main CLI tool
- `@avs-cli/bruteforce` - Brute force module
- `@avs-cli/directory-search` - Directory scanner module
- `@avs-cli/encryption-analyzer` - Encryption analysis module
- `@avs-cli/internet-archive` - Internet Archive integration module
- `@avs-cli/network-scan` - Network scanning module
- `@avs-cli/subdomain` - Subdomain discovery module

## Adding Dependencies

To add a dependency to a specific workspace:
```bash
npm install <package> -w @avs-cli/bruteforce
```

To add a dev dependency to a specific workspace:
```bash
npm install --save-dev <package> -w @avs-cli/bruteforce
```

To add a dependency that references another workspace package:
```bash
npm install @avs-cli/bruteforce -w @avs-cli/core
```

## Creating a New Module

1. Create a new directory under `modules/`:
```bash
mkdir modules/my-scanner
cd modules/my-scanner
```

2. Create `package.json`:
```json
{
  "name": "@avs-cli/my-scanner",
  "version": "1.0.0",
  "description": "My scanner module",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "prepare": "npm run build"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^20.10.6",
    "typescript": "^5.3.3"
  }
}
```

3. Create `tsconfig.json` (use a module's as template)

4. Create `src/index.ts`

5. Add to root `package.json` workspaces array

6. Run `npm install` to link the workspace

## Path Aliases

All modules can import from each other using path aliases:

```typescript
// Instead of relative paths
import { someUtil } from '../../../packages/core/src/utils';

// Use path aliases
import { someUtil } from '@avs-cli/core';
```

Path aliases are configured in each module's `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@avs-cli/*": ["../../packages/*/src", "../../modules/*/src"]
    }
  }
}
```

## TypeScript Project References

The root `tsconfig.json` uses TypeScript project references for faster incremental builds:

```json
{
  "references": [
    { "path": "./packages/core" },
    { "path": "./modules/bruteforce" },
    ...
  ]
}
```

Build with references:
```bash
tsc --build
```

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run build` | Build all workspaces |
| `npm run build:core` | Build only core package |
| `npm run build:modules` | Build only modules |
| `npm run dev` | Run core in dev mode |
| `npm run start` | Run compiled CLI |
| `npm run clean` | Clean dist folders in all workspaces |
| `npm run install:all` | Install and build everything |
| `npm run test` | Run tests in all workspaces |
| `npm run lint` | Lint all workspaces |

## VS Code Setup

Recommended VS Code settings for the monorepo (.vscode/settings.json):

```json
{
  "typescript.tsserver.experimental.enableProjectDiagnostics": true,
  "typescript.workspaceSymbolScope": "currentProject"
}
```

## CI/CD Considerations

When setting up CI/CD:

1. Install dependencies: `npm ci`
2. Build all packages: `npm run build`
3. Run tests: `npm run test --if-present`
4. Optionally, publish packages: `npm publish -ws`

## Troubleshooting

### Dependencies not resolving
```bash
npm install
npm run build --force
```

### TypeScript errors in VS Code
Reload the TypeScript server: Cmd/Ctrl + Shift + P → "TypeScript: Reload Projects"

### Module not found
Ensure the module is listed in root `package.json` workspaces array and has a `package.json` with a `name` field starting with `@avs-cli/`.

## References

- [npm workspaces documentation](https://docs.npmjs.com/cli/v9/using-npm/workspaces)
- [TypeScript project references](https://www.typescriptlang.org/docs/handbook/project-references.html)
