import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import solid from "@solidjs/vite-plugin";
import { defineConfig } from "vite";

const root = import.meta.dirname;
const packagesDir = join(root, "packages");
const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(packagesDir, entry.name, "lib/index.ts")));
const workspaceAliases = packageDirs.map((entry) => {
    const name = entry.name.startsWith("keybr-") ? entry.name.slice(6) : entry.name;
  return { find: new RegExp(`^@keybr/${name}$`), replacement: join(packagesDir, entry.name, "lib/index.ts") };
});

export default defineConfig(({ mode }) => ({
  root,
  base: "./",
  assetsInclude: ["**/*.data"],
  resolve: { alias: workspaceAliases },
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
              test: /packages[\\/]/,
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
