import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import solid from "@solidjs/vite-plugin";

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
  const devAssets = new Map<string, Uint8Array>();
  const devKeys = new Map<string, string>();
  let command: "build" | "serve" = "build";
  const prefix = "/@keybr-gzip/";
  return {
    name: "keybr-compressed-assets",
    enforce: "pre",
    configResolved(config) {
      command = config.command;
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = request.url;
        if (url == null || !url.startsWith(prefix)) return next();
        const key = url.slice(prefix.length).split("/", 1)[0];
        const source = devAssets.get(key);
        if (source == null) return next();
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/gzip");
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("Content-Length", String(source.byteLength));
        response.end(source);
      });
    },
    load(id) {
      const query = id.indexOf("?");
      const path = query < 0 ? id : id.slice(0, query);
      const suffix = query < 0 ? "" : id.slice(query + 1);
      if (suffix !== "gzip" && !path.endsWith(".data")) return null;
      const source = gzipSync(readFileSync(path), { level: 9 });
      if (command === "serve") {
        let key = devKeys.get(path);
        if (key == null) {
          key = String(devKeys.size);
          devKeys.set(path, key);
        }
        devAssets.set(key, source);
        return `export default ${JSON.stringify(`${prefix}${key}/${basename(path)}.gz`)};`;
      }
      const ref = this.emitFile({
        type: "asset",
        name: `${basename(path)}.gzipdata`,
        source,
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
