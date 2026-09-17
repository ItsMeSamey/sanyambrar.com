import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import solid from "@solidjs/vite-plugin";
import { defineConfig } from "vite";

const root = import.meta.dirname;
const sourceDir = join(root, "src");
const moduleAliases = readdirSync(sourceDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(sourceDir, entry.name, "index.ts")))
  .map((entry) => ({
    find: new RegExp(`^@keybr/${entry.name}$`),
    replacement: join(sourceDir, entry.name, "index.ts"),
  }));

export default defineConfig(({ mode }) => ({
  root,
  base: "./",
  assetsInclude: ["**/*.data"],
  resolve: { alias: moduleAliases },
  plugins: [solid()],
  define: { "process.env.NODE_ENV": JSON.stringify(mode) },
  css: { modules: { localsConvention: "camelCase" } },
  build: {
    outDir: resolve(root, "../../../.build/keybr"),
    emptyOutDir: true,
    target: "es2022",
    cssMinify: "lightningcss",
    minify: "oxc",
    assetsDir: "keybr-assets",
    assetsInlineLimit: 0,
    rolldownOptions: {
      preserveEntrySignatures: "allow-extension",
      output: {
        strictExecutionOrder: true,
        codeSplitting: {
          groups: [
            {
              name: "vendor",
              test: /node_modules/,
              minSize: 20_000,
              maxSize: 180_000,
              priority: 10,
            },
            {
              name: "keybr",
              test: /src[\\/][^\\/]+[\\/]/,
              minSize: 40_000,
              maxSize: 180_000,
              includeDependenciesRecursively: false,
              priority: 5,
            },
          ],
        },
      },
    },
  },
}));
