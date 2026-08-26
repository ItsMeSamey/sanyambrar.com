import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdir, readFile, readdir, rename, rm, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { promisify } from "node:util";
import { brotliCompress, brotliDecompress, constants, gzip, gunzip } from "node:zlib";
import { generateSite } from "./site.ts";

const runFile = promisify(execFile);
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const brotliAsync = promisify(brotliCompress);
const unbrotliAsync = promisify(brotliDecompress);

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
  await run(dir, process.execPath, ["./scripts/check-workspaces.mjs"]);
  // Use Bun directly and bypass webpack-cli. webpack-cli probes Webpack's aggregate
  // CommonJS export, which makes Bun touch deprecated compatibility getters. The
  // local runner imports Webpack's implementation directly and treats warnings as errors.
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

const SHARED_CSS_REQUIRED = [
  "::selection",
  ".samey-context-menu",
  ".samey-cursor-grab",
  ".samey-cursor-link",
  ".samey-cursor-loading",
  "::view-transition-old(samey-page)",
  "samey-control-expand",
  ".samey-cursor-link{transform:translate(-8.4px,8.4px)}",
  ".samey-vscroll",
  ".samey-hscroll",
  "width:64px;height:64px",
  "left:23.6px;top:23.6px;width:16.8px;height:16.8px",
] as const;

const RUNTIME_REQUIRED = [
  "Search web for selection",
  "Copy Markdown link",
  "requestFullscreen",
  'id="samey-grab-mask"',
  '<circle cx="32" cy="32" r="8.4" fill="white"/>',
  '<rect x="30.2" y="22.4" width="3.6" height="19.2" fill="black"/>',
  '<rect x="22.4" y="30.2" width="19.2" height="3.6" fill="black"/>',
  'class="samey-cursor-grab-pulse"',
  'values="8.4;4.8"',
  'dur=".18s"',
  'repeatCount="1"',
  'fill="remove"',
  'begin="indefinite"',
  "grabPulse.beginElement()",
  "document.elementFromPoint",
  "data-grab-cursor-on-drag",
  "samey-cursor-link-corner",
  "samey-cursor-link-click",
  "samey-cursor-link-fade",
  "scale(.2)",
  'type="translate"',
  'values="0 0;26 -26"',
  'values="1;0"',
  "linkClick.beginElement()",
  "linkFade.beginElement()",
  'attributeName="d"',
  'dur="${loadingGeometry.duration}s"',
  'repeatCount="indefinite"',
  'values="${frames.join(";")}"',
  'samey-app-preload',
  'samey-app-frame',
  "requestAnimationFrame(renderCursorPosition)",
  "startNativeDrag",
  "isPlainSelectionDrag",
  "selectionAtPoint",
  "selectionDragCandidate",
  "selectionDragging",
  "dropSelectionText",
  "event.preventDefault()",
  "delete cursor.dataset.visible",
  "unshiftCursor",
  "duration: 65",
  "virtualScrollerEligible",
  "r.width < 8 || r.height < 8",
  "x = innerWidth - 7",
  "topPx = 0",
  "link.dataset.sameyExternal",
  "openExternalBrowser",
  "DecompressionStream",
  '["brotli", ".br"]',
  '["gzip", ".gz"]',
  'link.rel = "noopener noreferrer"',
  "samey-context-menu",
  "samey-cursor-grab",
  "samey-cursor-link",
  "a[href],area[href],[role=link]",
  'stroke-width="11"',
  "linkHandoffUntil",
  'window.open(link.href, "_blank", "noopener,noreferrer")',
  "event.ctrlKey || event.metaKey",
  "samey-vscroll-thumb",
  "samey-hscroll-thumb",
  "pointerover",
  "pointerup",
  "contextmenu",
  "history.pushState",
  "popstate",
  "X-Samey-SPA",
  "loadingCursorSvg",
  "zeroCrossingPower: .8",
  "animateLoadingPaths",
  "const APP_ROUTE",
  "loadAppFrame",
  "samey-app-frame",
  "document.startViewTransition",
  "SameyNavigate",
  "SameyOpenAppearance",
  "enhanceWordleChrome",
  "enhanceKeybrChrome",
  "samey-pageleave",
  "Copy",
  "Paste",
  "Select all",
] as const;

const RUNTIME_REMOVED = [
  "Screenshot…",
  "getDisplayMedia",
  "setDragImage",
  "samey-native-drag-image",
  'fill-rule="evenodd"',
  "M32 18a14 14 0 1 1 0 28",
  '<rect x="29" y="16" width="6" height="7" fill="black"/>',
  '<rect x="16" y="29" width="7" height="6" fill="black"/>',
  "scale(.3333333333)",
  "scale(.1666666667)",
  'values="14;8"',
  'values="7;4"',
  '.samey-cursor-link{transform:translate(-7px,7px)}',
] as const;

function auditSharedRuntime(theme: string, css: string, where: string) {
  for (const token of RUNTIME_REQUIRED) must(theme.includes(token), `${where}/shared-runtime.js: missing runtime contract ${token}`);
  for (const token of RUNTIME_REMOVED) must(!theme.includes(token), `${where}/shared-runtime.js: removed/stale runtime feature leaked back in: ${token}`);
  for (const token of SHARED_CSS_REQUIRED) must(css.includes(token), `${where}/site.css: missing shared UI contract ${token}`);
}

async function auditSource() {
  for (const page of ["Home.tsx","Work.tsx","Lab.tsx","Project.tsx","Tools.tsx","Chain.tsx","Blog.tsx"]) must(existsSync(join(ROOT,"src/site/pages",page)), `Solid site page missing ${page}`);
  for (const component of ["SiteChrome.tsx","Entries.tsx","ExternalBrowser.tsx","icons.tsx"]) must(existsSync(join(ROOT,"src/site/components",component)), `shared Solid component missing ${component}`);
  const app = await readFile(join(ROOT,"src/site/App.tsx"),"utf8");
  for (const route of ["Home","Work","Lab","Project","Tools","Chain","Blog"]) must(app.includes(`import('./pages/${route}')`), `site: lazy route missing ${route}`);
  must(app.includes('await preload(next)') && app.includes("pointerover") && !app.includes('visited'), "site: route preloading/unmount lifecycle contract missing");
  const chrome = await readFile(join(ROOT,"src/site/components/SiteChrome.tsx"),"utf8");
  must(chrome.includes('function TopBar') && chrome.includes('function PrimaryNav') && chrome.includes('function AppearanceButton'), "site: shared top-bar controls missing");
  const toolsPage = await readFile(join(ROOT,"src/site/pages/Tools.tsx"),"utf8");
  const chainPage = await readFile(join(ROOT,"src/site/pages/Chain.tsx"),"utf8");
  must(toolsPage.includes('module.mountTools()') && toolsPage.includes('onCleanup'), "tools: Solid lifecycle mount/dispose missing");
  must(chainPage.includes('module.mountChain()') && chainPage.includes('onCleanup'), "chain: Solid lifecycle mount/dispose missing");
  const toolsRuntime=await readFile(join(ROOT,"src/site/engines/tools.ts"),"utf8");
  const chainRuntime=await readFile(join(ROOT,"src/site/engines/chain.ts"),"utf8");
  must(toolsRuntime.includes('export function mountTools()') && toolsRuntime.includes("🔗 Scroll") && toolsRuntime.includes("sourceToPreview") && toolsRuntime.includes("previewToSource"), "tools: lifecycle/Markdown linked scrolling missing");
  must(chainRuntime.includes('export function mountChain()') && chainRuntime.includes('resizeObserver.disconnect()') && chainRuntime.includes('themeObserver.disconnect()'), "chain: lifecycle cleanup missing");
  must(!existsSync(join(STATIC,"tools.html")) && !existsSync(join(STATIC,"chain.html")) && !existsSync(join(STATIC,"blog/index.html")), "Solid pages duplicated as static HTML");
  const sourceJs = [...await walk(join(ROOT, "src"), (_path, name) => name.endsWith(".js")), ...await walk(STATIC, (_path, name) => name.endsWith(".js"))];
  must(sourceJs.length === 0, `JavaScript source files are forbidden; use TypeScript: ${sourceJs.map(path => relative(ROOT, path)).join(", ")}`);
  for (const file of ["runtime.ts", "appearance.ts", "theme.ts", "site.ts"]) must(existsSync(join(ROOT, "src/shared", file)), `shared TypeScript runtime missing ${file}`);
  must(existsSync(join(ROOT, "src/blog/btop-lock.ts")) && existsSync(join(ROOT, "src/blog/btop-mutex.css")), "blog page-local TS/CSS source missing");
}

async function verifyDocs() {
  for (const file of ["index.html", "work.html", "lab.html", "projects/zhtml.html", "projects/reverb.html", "projects/oneserial.html", "projects/cnn.html", "keybr.html", "wordle.html", "chain.html", "tools.html", "shared-runtime.js", "site.css", "sw.js", "blog/index.html", "blog/posts/btop-mutex.html"]) must(existsSync(join(DOCS, file)), `missing docs/${file}`);
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
    must(/<script\s+(?:type=["']module["']\s+)?src=["'][^"']*shared-runtime\.js["']><\/script>/i.test(html), `${name}: missing shared TypeScript runtime bundle`);
    must(/data-home-href=|data-back-href=/i.test(html), `${name}: missing shared navigation metadata`);
    const raw = await readFile(path), gz = await gunzipAsync(await readFile(`${path}.gz`)), br = await unbrotliAsync(await readFile(`${path}.br`));
    must(Buffer.from(gz).equals(raw), `gzip drift: ${name}`);
    must(Buffer.from(br).equals(raw), `brotli drift: ${name}`);
  }

  const runtime = await readFile(join(DOCS, "shared-runtime.js"), "utf8"), css = await readFile(join(DOCS, "site.css"), "utf8");
  auditSharedRuntime(runtime, css, "docs");
  const post = await readFile(join(DOCS, "blog/posts/btop-mutex.html"), "utf8");
  must(post.includes("<h1>btop's broken lock</h1>"), "blog post title drift");
  must(post.includes('<p class="dek">the mutex that wasn\'t</p>'), "blog post subtitle drift");
  const expected = await deployAssets(), sw = await readFile(join(DOCS, "sw.js"), "utf8"), match = sw.match(/const CORE = (\[[^;]+\]);/);
  must(match && JSON.stringify(JSON.parse(match[1])) === JSON.stringify(expected), "service worker asset list drift");
}

async function main() {
  must(invalidTargets.length === 0, `unknown target: ${invalidTargets.join(", ")} (use solid, keybr, static, or all)`);
  await generateAppearance();
  await rm(GENERATED_SITE, { recursive: true, force: true });
  await generateSite(GENERATED_SITE);
  await Promise.all([buildSharedRuntime(), buildBlogPost(), buildSiteRuntime()]);
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
