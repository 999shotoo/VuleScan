#!/usr/bin/env node
/**
 * Installation and setup script for AVS CLI
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🔧 Setting up AVS CLI...\n");

// Create necessary directories
const dirs = ["./dist", "./scan-reports"];

dirs.forEach((dir) => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Create .gitkeep for scan-reports
const gitkeepPath = path.join(__dirname, "./scan-reports/.gitkeep");
if (!fs.existsSync(gitkeepPath)) {
  fs.writeFileSync(gitkeepPath, "");
  console.log("✅ Created .gitkeep file");
}

console.log("\n✨ Setup complete!");
console.log("\nNext steps:");
console.log("  1. npm install      - Install dependencies");
console.log("  2. npm run build    - Build TypeScript");
console.log("  3. npm start        - Start the CLI\n");
