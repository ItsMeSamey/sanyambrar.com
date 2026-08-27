import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdir, readFile, readdir, rename, rm, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { promisify } from "node:util";
import { brotliCompress, constants, gzip } from "node:zlib";
import { generateSite } from "./site.ts";

const runFile = promisify(execFile);
const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);

const ROOT = import.meta.dirname;
const STATIC = join(ROOT, "static");
const DOCS = join(ROOT, "docs");
const GENERATED_LESS = join(ROOT, "keybr/packages/keybr-themes/lib/themes/site-presets.generated.less");
const GENERATED_SITE = join(ROOT, ".build", "site");
const GENERATED_SITE_RUNTIME = join(ROOT, ".build", "site-runtime");
const GENERATED_SHARED_RUNTIME = join(ROOT, ".build", "shared-runtime");
const GENERATED_BLOG_POST = join(ROOT, ".build", "blog-post");
const ALL = new Set(["solid", "keybr", "static"]);
const requested = process.argv.slice(2);
const targets = requested.length === 0 || requested.includes("all") ? ALL : new Set(requested);
const invalidTargets = [...targets].filter((target) => !ALL.has(target));
const fullBuild = targets.size === ALL.size && [...ALL].every((target) => targets.has(target));
const DOCS_BACKUP = join(ROOT, ".build", "docs-backup");
let docsTransactionStarted = false;
let docsExistedBeforeBuild = false;

const log = (message: string) => console.log(`[build] ${message}`);
const must: (ok: unknown, message: string) => asserts ok = (ok, message) => { if (!ok) throw new Error(message); };

async function run(cwd: string, file: string, args: string[], env: NodeJS.ProcessEnv = {}) {
  const { stdout, stderr } = await runFile(file, args, { cwd, env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
  if (stdout.trim()) process.stdout.write(stdout);
  if (stderr.trim()) process.stderr.write(stderr);
}

async function dependencySignature(dir: string) {
  const files = ["package.json", "bun.lock"].map(name => join(dir, name)).filter(existsSync);
  must(files.length > 0, `dependencies: ${relative(ROOT, dir) || "."} has no package.json or bun.lock`);
  const hash = createHash("sha256");
  for (const file of files) hash.update(await readFile(file));
  return hash.digest("hex");
}

async function directDependenciesPresent(dir: string) {
  const packagePath = join(dir, "package.json");
  if (!existsSync(packagePath) || !existsSync(join(dir, "node_modules"))) return false;
  const pkg = JSON.parse(await readFile(packagePath, "utf8"));
  const requested = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const satisfies = (globalThis as any).Bun?.semver?.satisfies as ((version: string, range: string) => boolean) | undefined;
  for (const [name, range] of Object.entries<string>(requested)) {
    const installed = join(dir, "node_modules", ...name.split("/"), "package.json");
    if (!existsSync(installed)) return false;
    if (satisfies && /^[~^<>=*\dv. -]+$/.test(range)) {
      const version = JSON.parse(await readFile(installed, "utf8")).version;
      if (!version || !satisfies(version, range)) return false;
    }
  }
  return true;
}

async function ensureDeps(dir: string) {
  const lock = join(dir, "bun.lock");
  const stamp = join(dir, "node_modules/.samey-deps-sha256");
  const wanted = await dependencySignature(dir);
  if (existsSync(stamp) && (await readFile(stamp, "utf8")).trim() === wanted && await directDependenciesPresent(dir)) return;

  // Dependency archives are valid build inputs even if bun.lock is absent or
  // older than package.json. Verify the installed direct dependency versions
  // and avoid a network install when the local tree already satisfies them.
  if (await directDependenciesPresent(dir)) {
    await writeFile(stamp, `${wanted}\n`);
    return;
  }

  try {
    await run(dir, "bun", existsSync(lock) ? ["install", "--frozen-lockfile"] : ["install"]);
  } catch (error: any) {
    if (error?.code === "ENOENT") throw new Error(`dependencies for ${relative(ROOT, dir) || "."} are missing/stale and Bun is not installed`);
    throw error;
  }
  await mkdir(join(dir, "node_modules"), { recursive: true });
  await writeFile(stamp, `${await dependencySignature(dir)}\n`);
}

async function generateAppearance() {
  const config = JSON.parse(await readFile(join(STATIC, "shared/appearance.json"), "utf8"));
  const hex = /^#[0-9a-f]{6}$/i;
  for (const [id, color] of Object.entries<any>(config.colors)) {
    must(["light", "dark"].includes(color.tone), `appearance: ${id} has invalid tone`);
    for (const key of ["background", "text", "accent", "error", "slow", "fast", "effort"]) must(hex.test(color[key]), `appearance: ${id}.${key} is not #rrggbb`);
  }
  for (const [id, font] of Object.entries<any>(config.fonts)) must(font.label && font.stack, `appearance: incomplete font ${id}`);

  const lines = ["// Generated from static/shared/appearance.json. Do not edit."];
  for (const [id, color] of Object.entries<any>(config.colors)) for (const key of ["background", "text", "accent", "error", "slow", "fast", "effort"]) lines.push(`@samey-${id}-${key}: ${color[key]};`);
  await writeFile(GENERATED_LESS, `${lines.join("\n")}\n`);
}

async function walk(root: string, accept: (path: string, name: string) => boolean) {
  const files: string[] = [];
  const visit = async (dir: string) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && accept(path, entry.name)) files.push(path);
    }
  };
  if (existsSync(root)) await visit(root);
  return files.sort();
}


async function beginDocsTransaction() {
  docsExistedBeforeBuild = existsSync(DOCS);
  await rm(DOCS_BACKUP, { recursive: true, force: true });
  await mkdir(join(ROOT, ".build"), { recursive: true });
  if (docsExistedBeforeBuild) {
    if (fullBuild) await rename(DOCS, DOCS_BACKUP);
    else await cp(DOCS, DOCS_BACKUP, { recursive: true, force: true });
  }
  if (fullBuild) await mkdir(DOCS, { recursive: true });
  docsTransactionStarted = true;
}

async function rollbackDocsTransaction() {
  if (!docsTransactionStarted) return;
  await rm(DOCS, { recursive: true, force: true });
  if (docsExistedBeforeBuild && existsSync(DOCS_BACKUP)) await rename(DOCS_BACKUP, DOCS);
}

async function copyStatic() {
  await mkdir(DOCS, { recursive: true });
  // A partial static build updates an existing docs tree. Remove every output
  // owned by the Solid/static pipeline first, otherwise content-hashed Vite
  // chunks and deleted routes accumulate forever. Standalone Wordle/Keybr
  // artifacts are intentionally preserved unless their own target is built.
  const owned = [
    "index.html", "work.html", "tools.html", "chain.html",
    "blog", "projects", "site-app.js", "site-chunks", "assets",
    "site.css", "shared-runtime.js",
  ];
  await Promise.all(owned.map(name => rm(join(DOCS, name), { recursive: true, force: true })));
  await cp(STATIC, DOCS, { recursive: true, force: true });
  await cp(GENERATED_SITE, DOCS, { recursive: true, force: true });
  await cp(GENERATED_SITE_RUNTIME, DOCS, { recursive: true, force: true });
  await cp(GENERATED_SHARED_RUNTIME, DOCS, { recursive: true, force: true });
  await mkdir(join(DOCS, "blog", "posts"), { recursive: true });
  await cp(join(GENERATED_BLOG_POST, "btop-mutex.html"), join(DOCS, "blog", "posts", "btop-mutex.html"), { force: true });
}

async function cleanupBuildArtifacts() {
  const transientDocs = [
    "app.html",
    "app.js",
    "app.css",
  ];
  await Promise.all([
    rm(join(ROOT, ".build"), { recursive: true, force: true }),
    rm(join(ROOT, "dist"), { recursive: true, force: true }),
    rm(join(ROOT, "keybr/dist"), { recursive: true, force: true }),
    rm(GENERATED_LESS, { force: true }),
    ...transientDocs.map((name) => rm(join(DOCS, name), { recursive: true, force: true })),
  ]);
  for (const file of await walk(DOCS, (_path, name) => /^chunk-.*\.js$/.test(name))) {
    await rm(file, { force: true });
  }
}


async function buildSharedRuntime() {
  await ensureDeps(ROOT);
  await run(ROOT, process.execPath, ["./node_modules/vite/bin/vite.js", "build", "--config", "vite.shared.config.ts"]);
  must(existsSync(join(GENERATED_SHARED_RUNTIME, "shared-runtime.js")), "shared runtime bundle missing");
  must(existsSync(join(GENERATED_SHARED_RUNTIME, "site.css")), "shared stylesheet bundle missing");
  log("shared TypeScript runtime/CSS -> .build/shared-runtime");
}

async function buildBlogPost() {
  await ensureDeps(ROOT);
  await run(ROOT, process.execPath, ["./node_modules/vite/bin/vite.js", "build", "--config", "vite.blog.config.ts"]);
  const candidates = await walk(GENERATED_BLOG_POST, (_path, name) => name === "btop-mutex.html");
  must(candidates.length === 1, `blog single-file build emitted ${candidates.length} btop-mutex.html files`);
  if (candidates[0] !== join(GENERATED_BLOG_POST, "btop-mutex.html")) await rename(candidates[0], join(GENERATED_BLOG_POST, "btop-mutex.html"));
  const html = await readFile(join(GENERATED_BLOG_POST, "btop-mutex.html"), "utf8");
  must(/<style(?:\s|>)/i.test(html) && /<script(?:\s|>)/i.test(html), "blog single-file build did not inline page-local CSS/JS");
  must(!html.includes("btop-lock.ts") && !html.includes("btop-mutex.css"), "blog page-local source references leaked into output");
  log("blog page-local TypeScript/CSS -> inline HTML");
}

async function buildSiteRuntime() {
  await ensureDeps(ROOT);
  await run(ROOT, process.execPath, ["./node_modules/vite/bin/vite.js", "build", "--config", "vite.site.config.ts"]);
  must(existsSync(join(GENERATED_SITE_RUNTIME, "site-app.js")), "site runtime bundle missing");
  log("solid site SPA -> .build/site-runtime");
}

async function buildSolid() {
  await ensureDeps(ROOT);
  await Promise.all([
    run(ROOT, process.execPath, ["./node_modules/typescript/bin/tsc", "-b", "tsconfig.json", "--pretty", "false"]),
    run(ROOT, process.execPath, ["./node_modules/vite/bin/vite.js", "build"]),
  ]);
  must(existsSync(join(DOCS, "wordle.html")), "Vite did not emit docs/wordle.html");
  log("solid -> docs/wordle.html");
}



async function buildKeybr() {
  const dir = join(ROOT, "keybr");
  await ensureDeps(dir);
  // Run Webpack through the local Bun runner.
  await run(dir, process.execPath, ["./scripts/build-webpack.mjs"], { NODE_ENV: "production" });
  must(existsSync(join(DOCS, "keybr.html")), "Webpack did not emit docs/keybr.html");
  log("keybr -> docs/keybr.html");
}

async function deployAssets() {
  return (await walk(DOCS, (_path, name) => /\.(?:html|css|js)$/.test(name) && name !== "sw.js"))
    .map((path) => relative(DOCS, path).replaceAll("\\", "/"));
}

async function generateServiceWorker() {
  const files = await deployAssets();
  const hash = createHash("sha256");
  for (const file of files) hash.update(file).update("\0").update(await readFile(join(DOCS, file))).update("\0");
  const version = hash.digest("hex").slice(0, 16);
  const source = `// Generated by build.ts. Do not edit.\nconst CACHE_PREFIX = 'samey-site-';\nconst CACHE = CACHE_PREFIX + '${version}';\nconst ROOT = new URL('./', self.registration.scope);\nconst CORE = ${JSON.stringify(files)};\n\nself.addEventListener('install', event => {\n  event.waitUntil(Promise.all([\n    caches.open(CACHE).then(cache => cache.addAll(CORE.map(path => new URL(path, ROOT)))),\n    self.skipWaiting(),\n  ]));\n});\n\nself.addEventListener('activate', event => {\n  event.waitUntil(Promise.all([\n    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))),\n    self.clients.claim(),\n  ]));\n});\n\nconst offlineNavigation = async request => {\n  const cached = await caches.match(request);\n  if (cached) return cached;\n  const url = new URL(request.url);\n  if (url.pathname.endsWith('/')) {\n    const directoryIndex = await caches.match(new URL('index.html', url));\n    if (directoryIndex) return directoryIndex;\n  } else if (!url.pathname.split('/').pop()?.includes('.')) {\n    const htmlPage = await caches.match(new URL(url.pathname + '.html', url.origin));\n    if (htmlPage) return htmlPage;\n  }\n  return caches.match(new URL('index.html', ROOT));\n};\n\nself.addEventListener('fetch', event => {\n  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;\n  if (event.request.mode === 'navigate') {\n    event.respondWith((async () => {\n      try {\n        const response = await fetch(event.request);\n        if (response.ok) (await caches.open(CACHE)).put(event.request, response.clone());\n        return response;\n      } catch { return offlineNavigation(event.request); }\n    })());\n    return;\n  }\n  const refresh = fetch(event.request).then(async response => {\n    if (response.ok) (await caches.open(CACHE)).put(event.request, response.clone());\n    return response;\n  });\n  event.respondWith(caches.match(event.request).then(cached => cached || refresh).catch(() => refresh));\n  event.waitUntil(refresh.catch(() => undefined));\n});\n`;
  await writeFile(join(DOCS, "sw.js"), source);
}

async function compressHtml() {
  const pages = await walk(DOCS, (_path, name) => name.endsWith(".html"));
  await Promise.all(pages.map(async (page) => {
    const input = await readFile(page);
    const [gz, br] = await Promise.all([
      gzipAsync(input, { level: 9, mtime: 0 } as any),
      brotliAsync(input, { params: { [constants.BROTLI_PARAM_QUALITY]: 9, [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT } }),
    ]);
    await Promise.all([writeFile(`${page}.gz`, gz), writeFile(`${page}.br`, br)]);
  }));
  const sidecars = await walk(DOCS, (_path, name) => /\.html\.(?:gz|br)$/.test(name));
  await Promise.all(sidecars.map(async (sidecar) => { if (!existsSync(sidecar.replace(/\.(?:gz|br)$/, ""))) await unlink(sidecar); }));
}

async function main() {
  must(invalidTargets.length === 0, `unknown target: ${invalidTargets.join(", ")} (use solid, keybr, static, or all)`);
  await generateAppearance();
  await rm(GENERATED_SITE, { recursive: true, force: true });
  await generateSite(GENERATED_SITE);
  await Promise.all([buildSharedRuntime(), buildBlogPost(), buildSiteRuntime()]);
  await beginDocsTransaction();
  if (targets.has("static")) await copyStatic();
  const jobs: Promise<void>[] = [];
  if (targets.has("solid")) jobs.push(buildSolid());
  if (targets.has("keybr")) jobs.push(buildKeybr());
  await Promise.all(jobs);
  await compressHtml();
  if (targets.has("static")) await generateServiceWorker();
  if (fullBuild) log("build complete; docs/ is the GitHub Pages site root");
}

try {
  await main();
} catch (error) {
  await rollbackDocsTransaction();
  throw error;
} finally {
  await cleanupBuildArtifacts();
}
