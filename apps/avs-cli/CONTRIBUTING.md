# Contributing to AVS CLI Monorepo

Thank you for contributing to AVS CLI! This document provides guidelines for working with this monorepo.

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/avs-cli.git
cd avs-cli
```

2. Install dependencies:
```bash
npm install
```

3. Build all packages:
```bash
npm run build
```

## Working with Workspace Packages

### Understanding the Structure

- **`packages/core`** - Main CLI application with menu system
- **`modules/*`** - Individual security scanning modules

Each module is independently versioned and publishable.

### Making Changes to a Module

1. Navigate to the module:
```bash
cd modules/bruteforce
```

2. Make your changes in the `src/` directory

3. Build the module:
```bash
npm run build -w @avs-cli/bruteforce
```

### Making Changes to Core

1. Navigate to core:
```bash
cd packages/core
```

2. Make your changes in the `src/` directory

3. If you added new dependencies on modules, update `package.json` dependencies

4. Build:
```bash
npm run build:core
```

### Adding a New Module

See [MONOREPO.md](./MONOREPO.md#creating-a-new-module) for detailed instructions.

## Code Standards

- **Language**: TypeScript
- **Module System**: ESNext / ES Modules
- **Target**: ES2020
- **Linting**: Follow existing code style
- **Type Safety**: Use strict mode

### TypeScript Configuration

- Each package has its own `tsconfig.json`
- Path aliases use `@avs-cli/` scope
- Project references enable faster builds

## Testing

Run tests across all packages:
```bash
npm run test
```

Run tests in a specific package:
```bash
npm run test -w @avs-cli/bruteforce
```

## Building and Publishing

### Local Build and Test

```bash
npm run build
npm run start
```

### Running Individual Modules

```bash
# Run an individual module if it has a CLI
node modules/bruteforce/dist/cli/cli.js --help
```

### Publishing Packages

Individual packages are published to npm under the `@avs-cli/` scope:

```bash
# Publish all packages
npm publish -ws

# Publish a specific package
npm publish -w @avs-cli/bruteforce
```

**Note**: Package versions must be unique. Use semantic versioning.

## Dependency Management

### Adding a Dependency to a Module

```bash
# Add to @avs-cli/bruteforce
npm install axios -w @avs-cli/bruteforce

# Add as dev dependency
npm install --save-dev @types/node -w @avs-cli/bruteforce
```

### Adding Cross-Module Dependencies

If Module A depends on Module B:

```bash
# Add @avs-cli/directory-search as dependency to bruteforce
npm install @avs-cli/directory-search -w @avs-cli/bruteforce
```

### Updating Dependencies

```bash
# Update all workspaces
npm update -ws

# Update a specific package
npm update -w @avs-cli/bruteforce
```

## Git Workflow

1. Create a feature branch:
```bash
git checkout -b feature/module-name-improvement
```

2. Make your changes and commit:
```bash
git add .
git commit -m "feat: describe your changes"
```

3. Follow conventional commits:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation only
   - `style:` - Code style (no logic change)
   - `refactor:` - Code refactor
   - `test:` - Adding or updating tests
   - `chore:` - Dependency updates, build config

4. Push and create a pull request:
```bash
git push origin feature/module-name-improvement
```

## Common Tasks

### Building for Production

```bash
npm run clean
npm run build
# Packages are ready in dist/ directories
```

### Cleaning Build Artifacts

```bash
npm run clean
```

### Checking TypeScript

```bash
npm run build -- --noEmit
```

### Development Workflow

For active development on the CLI:

```bash
# Terminal 1: Watch and rebuild a module
npm run build -w @avs-cli/bruteforce -- --watch

# Terminal 2: Run the main CLI
npm run dev
```

## Troubleshooting

### Module not found errors
```bash
npm install
npm run build --force
```

### TypeScript errors after changes
```bash
# Clean and rebuild
npm run clean
npm run build
```

### Workspace not recognized
Ensure:
1. Module has `package.json` with `name` starting with `@avs-cli/`
2. Module is listed in root `package.json` workspaces array
3. Run `npm install` to re-link workspaces

### Build issues
```bash
# Clean everything
rm -r node_modules package-lock.json
npm install
npm run build
```

## Documentation

- [Main README](./README.md)
- [Monorepo Guide](./MONOREPO.md)
- [Architecture](./ARCHITECTURE.md)
- [Implementation Guide](./IMPLEMENTATION.md)

## Questions or Issues?

- Check existing issues in the repository
- Review the MONOREPO.md guide
- Check module-specific README files

## Code Review

When submitting PRs:

1. Ensure all packages build: `npm run build`
2. Update tests if applicable: `npm run test`
3. Follow code standards and style existing code
4. Provide clear PR descriptions
5. Reference related issues

## License

All contributions are under the MIT License.

Happy coding!
