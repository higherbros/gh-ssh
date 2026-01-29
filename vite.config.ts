import { builtinModules } from "node:module";
import { defineConfig } from "vite";

const external = [
  ...builtinModules,
  ...builtinModules.map((module) => `node:${module}`)
];

export default defineConfig({
  build: {
    target: "node22",
    lib: {
      entry: "src/cli.ts",
      formats: ["es"],
      fileName: "cli"
    },
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      external,
      output: {
        banner: "#!/usr/bin/env node"
      }
    }
  }
});
