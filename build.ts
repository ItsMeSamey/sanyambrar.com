import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdir, readFile, readdir, rename, rm, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { promisify } from "node:util";
import { brotliCompress, brotliDecompress, constants, gzip, gunzip } from "node:zlib";

const runFile = promisify(execFile);
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const brotliAsync = promisify(brotliCompress);
const unbrotliAsync = promisify(brotliDecompress);

const ROOT = import.meta.dirname;
const STATIC = join(ROOT, "static");
const DOCS = join(ROOT, "docs");
const GENERATED_LESS = join(ROOT, "keybr/packages/keybr-themes/lib/themes/site-presets.generated.less");
const GENERATED_APPEARANCE = join(STATIC, "appearance.generated.js");
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

async function sha256(path: string) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function ensureDeps(dir: string) {
  const lock = join(dir, "bun.lock");
  const stamp = join(dir, "node_modules/.samey-lock-sha256");
  const wanted = await sha256(lock);
  if (existsSync(stamp) && (await readFile(stamp, "utf8")).trim() === wanted) return;
  try {
    await run(dir, "bun", ["install", "--frozen-lockfile"]);
  } catch (error: any) {
    if (error?.code === "ENOENT") throw new Error(`dependencies for ${relative(ROOT, dir) || "."} are missing/stale and Bun is not installed`);
    throw error;
  }
  await mkdir(join(dir, "node_modules"), { recursive: true });
  await writeFile(stamp, `${wanted}\n`);
}

async function generateAppearance() {
  const config = JSON.parse(await readFile(join(STATIC, "shared/appearance.json"), "utf8"));
  const hex = /^#[0-9a-f]{6}$/i;
  for (const [id, color] of Object.entries<any>(config.colors)) {
    must(["light", "dark"].includes(color.tone), `appearance: ${id} has invalid tone`);
    for (const key of ["background", "text", "accent", "error", "slow", "fast", "effort"]) must(hex.test(color[key]), `appearance: ${id}.${key} is not #rrggbb`);
  }
  for (const [id, font] of Object.entries<any>(config.fonts)) must(font.label && font.stack, `appearance: incomplete font ${id}`);

  await writeFile(GENERATED_APPEARANCE, `// Generated from static/shared/appearance.json. Do not edit.\nObject.defineProperty(globalThis, "SameyAppearanceConfig", { value: Object.freeze(${JSON.stringify(config)}), configurable: false, writable: false });\n`);
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
  await cp(STATIC, DOCS, { recursive: true, force: true });
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
    ...transientDocs.map((name) => rm(join(DOCS, name), { recursive: true, force: true })),
  ]);
  for (const file of await walk(DOCS, (_path, name) => /^chunk-.*\.js$/.test(name))) {
    await rm(file, { force: true });
  }
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
  await run(dir, process.execPath, ["./scripts/check-workspaces.mjs"]);
  await run(dir, process.execPath, ["./node_modules/webpack/bin/webpack.js"], { NODE_ENV: "production" });
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
  const source = `// Generated by build.ts. Do not edit.\nconst CACHE_PREFIX = 'samey-site-';\nconst CACHE = CACHE_PREFIX + '${version}';\nconst ROOT = new URL('./', self.registration.scope);\nconst CORE = ${JSON.stringify(files)};\n\nself.addEventListener('install', event => {\n  event.waitUntil(Promise.all([\n    caches.open(CACHE).then(cache => cache.addAll(CORE.map(path => new URL(path, ROOT)))),\n    self.skipWaiting(),\n  ]));\n});\n\nself.addEventListener('activate', event => {\n  event.waitUntil(Promise.all([\n    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))),\n    self.clients.claim(),\n  ]));\n});\n\nconst offlineNavigation = async request => {\n  const cached = await caches.match(request);\n  if (cached) return cached;\n  const url = new URL(request.url);\n  if (url.pathname.endsWith('/')) {\n    const directoryIndex = await caches.match(new URL('index.html', url));\n    if (directoryIndex) return directoryIndex;\n  }\n  return caches.match(new URL('index.html', ROOT));\n};\n\nself.addEventListener('fetch', event => {\n  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;\n  if (event.request.mode === 'navigate') {\n    event.respondWith((async () => {\n      try {\n        const response = await fetch(event.request);\n        if (response.ok) (await caches.open(CACHE)).put(event.request, response.clone());\n        return response;\n      } catch { return offlineNavigation(event.request); }\n    })());\n    return;\n  }\n  const refresh = fetch(event.request).then(async response => {\n    if (response.ok) (await caches.open(CACHE)).put(event.request, response.clone());\n    return response;\n  });\n  event.respondWith(caches.match(event.request).then(cached => cached || refresh).catch(() => refresh));\n  event.waitUntil(refresh.catch(() => undefined));\n});\n`;
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

async function auditSource() {
  for (const lock of ["bun.lock", "keybr/bun.lock"]) must(existsSync(join(ROOT, lock)), `missing frozen dependency lock: ${lock}`);
  const theme = await readFile(join(STATIC, "theme.js"), "utf8");
  const provider = await readFile(join(ROOT, "keybr/packages/keybr-themes/lib/themes/ThemeProvider.tsx"), "utf8");
  const appearance = JSON.parse(await readFile(join(STATIC, "shared/appearance.json"), "utf8"));
  const generatedAppearance = await readFile(GENERATED_APPEARANCE, "utf8");
  const generatedLess = await readFile(GENERATED_LESS, "utf8");
  must(theme.includes('Object.defineProperty(globalThis, "SameyAppearance"'), "shared appearance API missing");
  must(theme.includes("SameyAppearanceConfig"), "shared runtime must consume generated appearance config");
  must(generatedAppearance.includes(JSON.stringify(appearance)), "generated appearance JS drift");
  for (const [id, color] of Object.entries<any>(appearance.colors)) for (const key of ["background", "text", "accent", "error", "slow", "fast", "effort"]) must(generatedLess.includes(`@samey-${id}-${key}: ${color[key]};`), `generated Keybr palette drift: ${id}.${key}`);
  must(!theme.includes("Storage.prototype.setItem ="), "appearance runtime must not monkeypatch Storage");
  must(provider.includes("globalThis.SameyAppearance"), "Keybr must consume shared appearance API");
  must(!provider.includes("localStorage") && !provider.includes("keybr.theme") && !provider.includes("samey.font"), "appearance persistence leaked into Keybr");
  must(!provider.includes("mix(") && !provider.includes("style.setProperty"), "Keybr duplicates shared appearance derivation");
  must(!(await readFile(join(ROOT, "keybr/packages/keybr-themes/lib/themes/index.ts"), "utf8")).includes("./themes.ts"), "dead Keybr appearance API re-exported");

  const lessFiles = await walk(join(ROOT, "keybr/packages"), (_path, name) => name.endsWith(".less"));
  const used = new Set<string>(), defined = new Set<string>();
  for (const file of lessFiles) {
    const text = await readFile(file, "utf8");
    for (const match of text.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) used.add(match[1]);
    for (const match of text.matchAll(/(^|[;{]\s*)(--[A-Za-z0-9_-]+)\s*:/gm)) defined.add(match[2]);
  }
  const missing = [...used].filter((name) => !defined.has(name)).sort();
  must(missing.length === 0, `Keybr CSS variables used but never defined:\n${missing.join("\n")}`);
  const keybrGuard = 'if (root.dataset.siteKind === "wordle")';
  must(theme.includes(keybrGuard), "Wordle palette variables are not scoped away from Keybr");
  for (const name of ["--primary", "--secondary", "--accent"]) must(theme.indexOf(`setProperty("${name}"`) >= theme.indexOf(keybrGuard), `${name} is written outside the Wordle-only scope`);

  const home = await readFile(join(STATIC, "index.html"), "utf8");
  must(home.includes("Sanyam Brar"), "homepage identity must be Sanyam Brar");
  must(!home.includes("Systems / backend / performance"), "deprecated homepage role label is still present");

  const sharedCss = await readFile(join(STATIC, "site.css"), "utf8");
  const viteConfig = await readFile(join(ROOT, "vite.config.ts"), "utf8");
  const webpackConfig = await readFile(join(ROOT, "keybr/webpack.config.js"), "utf8");
  const singleFilePlugin = await readFile(join(ROOT, "keybr/webpack-single-file.js"), "utf8");
  must(viteConfig.includes("outDir: 'docs'") && viteConfig.includes("emptyOutDir: false"), "Wordle must build directly into docs/");
  must(webpackConfig.includes('path: join(rootDir, "../docs")') && webpackConfig.includes("clean: false"), "Keybr must build directly into docs/");
  must(singleFilePlugin.includes('"keybr.html"'), "Keybr single-file build must emit docs/keybr.html");
  const wordleCss = await readFile(join(ROOT, "src/css/index.css"), "utf8");
  for (const token of ["::selection", ".samey-site-controls", ".samey-context-menu", ".samey-cursor-grab", ".samey-cursor-link"]) must(sharedCss.includes(token), `shared UI CSS missing ${token}`);
  for (const token of ["Search web for selection", "Copy Markdown link", "requestFullscreen", 'fill-rule="evenodd"', "M32 18a14 14 0 1 1 0 28", "samey-cursor-link-corner", "scale(.3333333333)", "offset: .699", "offset: .7", "duration: 1500", 'link.target = "_blank"', 'link.rel = "noopener noreferrer"']) must(theme.includes(token), `shared runtime missing ${token}`);
  for (const token of ["Screenshot…", "getDisplayMedia", '<rect x="29" y="16" width="6" height="7" fill="black"/>']) must(!theme.includes(token), `shared runtime still contains removed ${token}`);
  for (const token of ["--wordle-control-top", "--wordle-control-right", "top: var(--wordle-control-top) !important", "right: var(--wordle-control-right) !important", "animation: result-pop .04s ease-out"]) must(wordleCss.includes(token), `Wordle control/reveal contract missing ${token}`);
}

async function verifyDocs() {
  for (const file of ["index.html", "keybr.html", "wordle.html", "theme.js", "sw.js", "blog/index.html", "blog/posts/btop-mutex.html"]) must(existsSync(join(DOCS, file)), `missing docs/${file}`);
  const keybr = await readFile(join(DOCS, "keybr.html"), "utf8"), wordle = await readFile(join(DOCS, "wordle.html"), "utf8");
  for (const [name, html] of [["keybr", keybr], ["wordle", wordle]] as const) must(!html.includes('manifest="appcache.manifest"'), `${name}: obsolete AppCache manifest`);
  must(!keybr.includes('<header class="site-header"'), "keybr: stale custom header emitted");
  must(keybr.includes('data-site-kind="keybr"'), "keybr: missing Keybr theme namespace marker");
  must(wordle.includes('data-site-kind="wordle"'), "wordle: missing Wordle theme namespace marker");
  must(!keybr.includes("Change the color theme.") && !keybr.includes("Change the interface font."), "keybr: stale native appearance controls emitted");
  must(wordle.includes("Active Games") && wordle.includes("stats-page"), "wordle: expected game/statistics UI missing");

  const pages = await walk(DOCS, (_path, name) => name.endsWith(".html"));
  for (const path of pages) {
    const html = await readFile(path, "utf8"), name = relative(DOCS, path);
    must(/<script\s+src=["'][^"']*appearance\.generated\.js["']><\/script>/i.test(html), `${name}: missing generated appearance config`);
    must(/<script\s+src=["'][^"']*theme\.js["']><\/script>/i.test(html), `${name}: missing shared theme/runtime script`);
    must(/data-home-href=|data-back-href=/i.test(html), `${name}: missing shared navigation metadata`);
    const raw = await readFile(path), gz = await gunzipAsync(await readFile(`${path}.gz`)), br = await unbrotliAsync(await readFile(`${path}.br`));
    must(Buffer.from(gz).equals(raw), `gzip drift: ${name}`);
    must(Buffer.from(br).equals(raw), `brotli drift: ${name}`);
  }

  const theme = await readFile(join(DOCS, "theme.js"), "utf8"), css = await readFile(join(DOCS, "site.css"), "utf8");
  for (const token of ["samey-site-controls", "samey-context-menu", "samey-cursor-grab", "samey-cursor-link", "samey-cursor-link-corner", "a[href],area[href],[role=link]", "M42 0 H84 V42", "M59.5 3.5 H80.5 V24.5", "scale(.3333333333)", "offset: .699", "offset: .7", "duration: 1500", 'link.target = "_blank"', 'link.rel = "noopener noreferrer"', "samey-vscroll-thumb", "samey-hscroll-thumb", "pointerrawupdate", "contextmenu", "history.pushState", "popstate", "X-Samey-SPA", "Copy", "Paste", "Select all", "Copy Markdown link", 'fill-rule="evenodd"', "M32 18a14 14 0 1 1 0 28"]) must(theme.includes(token), `theme.js: missing runtime contract ${token}`);
  for (const token of ["getDisplayMedia", "Screenshot…", '<rect x="29" y="16" width="6" height="7" fill="black"/>', '<rect x="16" y="29" width="7" height="6" fill="black"/>']) must(!theme.includes(token), `theme.js: removed runtime feature leaked back in: ${token}`);
  for (const token of ["::selection", ".samey-site-controls", "left:12px", "cursor:none!important", ".samey-context-menu", ".samey-vscroll", ".samey-hscroll", "width:64px;height:64px", "left:18px;top:18px;width:28px;height:28px"]) must(css.includes(token), `site.css: missing shared UI contract ${token}`);
  const post = await readFile(join(DOCS, "blog/posts/btop-mutex.html"), "utf8");
  must(post.includes("<h1>btop's broken lock</h1>"), "blog post title drift");
  must(post.includes('<p class="dek">the mutex that wasn\'t</p>'), "blog post subtitle drift");
  const expected = await deployAssets(), sw = await readFile(join(DOCS, "sw.js"), "utf8"), match = sw.match(/const CORE = (\[[^;]+\]);/);
  must(match && JSON.stringify(JSON.parse(match[1])) === JSON.stringify(expected), "service worker asset list drift");
}

async function main() {
  must(invalidTargets.length === 0, `unknown target: ${invalidTargets.join(", ")} (use solid, keybr, static, or all)`);
  await generateAppearance();
  await auditSource();
  await beginDocsTransaction();
  if (targets.has("static")) await copyStatic();
  const jobs: Promise<void>[] = [];
  if (targets.has("solid")) jobs.push(buildSolid());
  if (targets.has("keybr")) jobs.push(buildKeybr());
  await Promise.all(jobs);
  await compressHtml();
  if (fullBuild) {
    await generateServiceWorker();
    await verifyDocs();
    log("all verification passed; docs/ is the GitHub Pages site root");
  }
}

try {
  await main();
} catch (error) {
  await rollbackDocsTransaction();
  throw error;
} finally {
  await cleanupBuildArtifacts();
}
