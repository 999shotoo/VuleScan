import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  bundle: true,
  // Bundle all @vulscan/* workspace packages into the output
  noExternal: [/@vulscan\/.*/],
  // Keep runtime dependencies external (native addons can't be bundled)
  external: ["inquirer", "ssh2"],
  banner: {
    js: "#!/usr/bin/env node\nimport { createRequire as __createRequire } from 'module';\nconst require = __createRequire(import.meta.url);",
  },
  clean: true,
  sourcemap: false,
});
