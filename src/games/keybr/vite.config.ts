import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import solid from "vite-plugin-solid";
import { viteSingleFile } from "vite-plugin-singlefile";

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

const gzipDataUrl = (data: Buffer) =>
  `data:application/gzip;base64,${gzipSync(data, { level: 9 }).toString("base64")}`;

function compressedAssets(): Plugin {
  return {
    name: "keybr-compressed-assets",
    enforce: "pre",
    load(id) {
      const query = id.indexOf("?");
      const path = query < 0 ? id : id.slice(0, query);
      const suffix = query < 0 ? "" : id.slice(query + 1);
      if (suffix === "gzip") {
        return `export default ${JSON.stringify(gzipDataUrl(readFileSync(path)))};`;
      }
      if (path.endsWith(".data")) {
        return `export default ${JSON.stringify(gzipDataUrl(readFileSync(path)))};`;
      }
      return null;
    },
  };
}

export default defineConfig(({ mode }) => ({
  root,
  base: "./",
  resolve: { alias: workspaceAliases },
  plugins: [compressedAssets(), solid(), viteSingleFile()],
  define: { "process.env.NODE_ENV": JSON.stringify(mode) },
  css: { modules: { localsConvention: "camelCase" } },
  build: {
    outDir: resolve(root, "../../../.build/keybr"),
    emptyOutDir: true,
    target: "es2022",
    cssMinify: "lightningcss",
    minify: "oxc",
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
  },
}));
