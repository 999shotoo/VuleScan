.PHONY: help install build dev start clean test lint build-core build-modules rebuild publish docs

help:
	@echo "AVS CLI Monorepo - Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  make install      - Install all dependencies"
	@echo "  make build        - Build all packages"
	@echo "  make build-core   - Build core package only"
	@echo "  make build-modules- Build all modules"
	@echo "  make dev          - Run CLI in development mode"
	@echo "  make start        - Run compiled CLI"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean        - Clean all build artifacts"
	@echo "  make rebuild      - Clean and rebuild all"
	@echo "  make test         - Run tests in all workspaces"
	@echo "  make lint         - Lint all workspaces"
	@echo ""
	@echo "Publishing:"
	@echo "  make publish      - Publish all packages to npm"
	@echo ""
	@echo "Documentation:"
	@echo "  make docs         - Show documentation files"

install:
	npm install

build:
	npm run build

build-core:
	npm run build:core

build-modules:
	npm run build:modules

dev:
	npm run dev

start: build
	npm run start

clean:
	npm run clean

rebuild: clean build

test:
	npm run test

lint:
	npm run lint

publish: build
	npm publish -ws

docs:
	@echo "Documentation files:"
	@echo "  - MONOREPO.md      - Monorepo structure and workflows"
	@echo "  - CONTRIBUTING.md  - Contributing guidelines"
	@echo "  - ARCHITECTURE.md  - Architecture documentation"
	@echo "  - USAGE_GUIDE.md   - Usage guide"
	@echo ""
	@echo "For detailed info, see: cat MONOREPO.md"

install-all: install build
	@echo "✅ All dependencies installed and built successfully!"

.DEFAULT_GOAL := help
