import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import solid from "vite-plugin-solid";

const root = import.meta.dirname;
const packagesDir = join(root, "packages");
const workspaceAliases = Object.fromEntries(
  readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const dir = join(packagesDir, entry.name);
      try {
        const pkg: unknown = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
        const name = pkg !== null && typeof pkg === "object" && "name" in pkg ? pkg.name : undefined;
        return typeof name === "string" && name.startsWith("@keybr/") ? [[name, dir]] : [];
      } catch {
        return [];
      }
    }),
);

function compressedAssets(): Plugin {
  return {
    name: "keybr-compressed-assets",
    enforce: "pre",
    load(id) {
      const query = id.indexOf("?");
      const path = query < 0 ? id : id.slice(0, query);
      const suffix = query < 0 ? "" : id.slice(query + 1);
      if (suffix !== "gzip" && !path.endsWith(".data")) return null;
      const ref = this.emitFile({
        type: "asset",
        name: `${basename(path)}.gz`,
        source: gzipSync(readFileSync(path), { level: 9 }),
      });
      return `export default import.meta.ROLLUP_FILE_URL_${ref};`;
    },
  };
}

export default defineConfig(({ mode }) => ({
  root,
  base: "./",
  resolve: { alias: workspaceAliases },
  plugins: [compressedAssets(), solid()],
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
