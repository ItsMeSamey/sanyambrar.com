import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { promisify } from "node:util";
import { details, games, posts, projects } from "./src/site/data.ts";

const runFile = promisify(execFile);
const APPEARANCE_COLOR_KEYS = ['background', 'text', 'accent', 'error', 'slow', 'fast', 'effort'] as const;
type UnknownRecord = Record<string, unknown>;
type ViteManifestEntry = {
  file: string;
  src?: string;
  imports?: string[];
  dynamicImports?: string[];
  css?: string[];
  assets?: string[];
};
type ViteManifest = Record<string, ViteManifestEntry>;
const isRecord = (value: unknown): value is UnknownRecord => value !== null && typeof value === "object" && !Array.isArray(value);
let siteManifest: ViteManifest = {};
let keybrManifest: ViteManifest = {};

const ROOT = import.meta.dirname;
const SITE_PUBLIC = join(ROOT, "src/site/public");
const DOCS = join(ROOT, "docs");
const GENERATED_SITE = join(ROOT, ".build", "site");
const GENERATED_SITE_RUNTIME = join(ROOT, ".build", "site-runtime");
const GENERATED_SHARED_RUNTIME = join(ROOT, ".build", "shared-runtime");
const GENERATED_BLOG_POST = join(ROOT, ".build", "blog-post");
const GENERATED_WORDLE = join(ROOT, ".build", "wordle");
const GENERATED_KEYBR = join(ROOT, ".build", "keybr");
const ALL = new Set(["wordle", "keybr", "site"]);
const requested = process.argv.slice(2);
const targets = requested.length === 0 || requested.includes("all") ? ALL : new Set(requested);
const invalidTargets = [...targets].filter((target) => !ALL.has(target));
const fullBuild = targets.size === ALL.size && [...ALL].every((target) => targets.has(target));
const DOCS_BACKUP = join(ROOT, ".build", "docs-backup");
let docsTransactionStarted = false;
let docsExistedBeforeBuild = false;

const log = (message: string) => console.log(`[build] ${message}`);
const must: (ok: unknown, message: string) => asserts ok = (ok, message) => { if (!ok) throw new Error(message); };
const requireRecord = (value: unknown, message: string): UnknownRecord => { must(isRecord(value), message); return value; };
const siteShell = (title: string, kind: string, root = "./") => `<!doctype html><html lang="en" data-site-spa data-site-kind="${kind}" data-site-page="${kind}" data-home-href="${root}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark"><title>${title}</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${root}site.css" data-samey-shared><script src="${root}shared-runtime.js"></script><script type="module" src="${root}site-app.js"></script></head><body><div id="site-root"></div></body></html>`;

async function generateSiteRoute(root: string, path: string, title: string, kind: string, assetRoot: string) {
  const routeDir = join(root, path);
  await mkdir(routeDir, { recursive: true });
  await writeFile(join(routeDir, "index.html"), siteShell(title, kind, assetRoot));
}

async function generateSite(root: string) {
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "index.html"), siteShell("Sanyam Brar", "home"));
  await Promise.all([
    generateSiteRoute(root, "work", "Work · Sanyam Brar", "work", "../"),
    generateSiteRoute(root, "tools", "Tools · Sanyam Brar", "tools", "../"),
    generateSiteRoute(root, "chain", "Chain Reaction", "chain", "../"),
    generateSiteRoute(root, "blog", "Writing · Sanyam Brar", "blog", "../"),
    ...Object.entries(details).map(([slug, detail]) => generateSiteRoute(root, `projects/${slug}`, `${detail.title} · Sanyam Brar`, "project", "../../")),
  ]);
}

async function runViteBuild(target: "wordle" | "keybr" | "site" | "blog" | "shared") {
  const { stdout, stderr } = await runFile(process.execPath, ["./node_modules/vite/bin/vite.js", "build"], {
    cwd: ROOT,
    env: { ...process.env, SAMEY_VITE_BUILD: target },
    maxBuffer: 64 * 1024 * 1024,
  });
  if (stdout.trim()) process.stdout.write(stdout);
  if (stderr.trim()) process.stderr.write(stderr);
}

async function generateAppearance() {
  const appearancePath = join(ROOT, "src/shared/appearance.json");
  const config = requireRecord(JSON.parse(await readFile(appearancePath, "utf8")), `${relative(ROOT, appearancePath)} must contain a JSON object`);
  const colors = requireRecord(config.colors, "appearance: colors must be an object");
  const fonts = requireRecord(config.fonts, "appearance: fonts must be an object");
  const hex = /^#[0-9a-f]{6}$/i;
  for (const [id, color] of Object.entries(colors)) {
    must(isRecord(color) && (color.tone === "light" || color.tone === "dark"), `appearance: ${id} has invalid tone`);
    for (const key of APPEARANCE_COLOR_KEYS) {
      const value = color[key];
      must(typeof value === "string" && hex.test(value), `appearance: ${id}.${key} is not #rrggbb`);
    }
  }
  for (const [id, font] of Object.entries(fonts))
    must(isRecord(font) && typeof font.label === "string" && !!font.label && typeof font.stack === "string" && !!font.stack, `appearance: incomplete font ${id}`);
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

async function readViteManifest(root: string): Promise<ViteManifest> {
  const path = join(root, ".vite", "manifest.json");
  const raw = requireRecord(JSON.parse(await readFile(path, "utf8")), relative(ROOT, path) + " must contain a manifest object");
  const out: ViteManifest = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isRecord(value) || typeof value.file !== "string") continue;
    out[key] = {
      file: value.file,
      src: typeof value.src === "string" ? value.src : undefined,
      imports: Array.isArray(value.imports) ? value.imports.filter((item): item is string => typeof item === "string") : undefined,
      dynamicImports: Array.isArray(value.dynamicImports) ? value.dynamicImports.filter((item): item is string => typeof item === "string") : undefined,
      css: Array.isArray(value.css) ? value.css.filter((item): item is string => typeof item === "string") : undefined,
      assets: Array.isArray(value.assets) ? value.assets.filter((item): item is string => typeof item === "string") : undefined,
    };
  }
  return out;
}

function manifestEntryKey(manifest: ViteManifest, sourceSuffix: string): string {
  const match = Object.entries(manifest).find(([key, entry]) =>
    key.endsWith(sourceSuffix) || entry.src?.endsWith(sourceSuffix));
  must(match, "manifest entry missing for " + sourceSuffix);
  return match[0];
}

function manifestStaticResources(manifest: ViteManifest, sourceSuffix: string): { scripts: string[]; styles: string[] } {
  const scripts = new Set<string>();
  const styles = new Set<string>();
  const seen = new Set<string>();
  const visit = (key: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    const entry = manifest[key];
    must(entry, "manifest import missing: " + key);
    scripts.add(entry.file);
    for (const css of entry.css ?? []) styles.add(css);
    for (const imported of entry.imports ?? []) visit(imported);
  };
  visit(manifestEntryKey(manifest, sourceSuffix));
  return { scripts: [...scripts], styles: [...styles] };
}

const htmlAttr = (value: string) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
const jsonForHtml = (value: unknown) => JSON.stringify(value).replaceAll("<", "\\u003c");

async function injectSitePreloadHints() {
  const siteEntryResources = manifestStaticResources(siteManifest, "src/site/main.tsx");
  const siteEntryScripts = new Set(siteEntryResources.scripts);
  const routes: { file: string; assetRoot: string; sources: string[] }[] = [
    { file: "index.html", assetRoot: "./", sources: ["src/site/pages/Home.tsx"] },
    { file: "work/index.html", assetRoot: "../", sources: ["src/site/pages/Work.tsx"] },
    { file: "tools/index.html", assetRoot: "../", sources: ["src/tools/Tools.tsx"] },
    { file: "chain/index.html", assetRoot: "../", sources: ["src/games/chain/Chain.tsx"] },
    { file: "blog/index.html", assetRoot: "../", sources: ["src/blogs/Blog.tsx"] },
    { file: "projects/reverb/index.html", assetRoot: "../../", sources: ["src/site/pages/Project.tsx", "src/site/components/ReverbDemo.tsx"] },
    { file: "projects/cnn/index.html", assetRoot: "../../", sources: ["src/site/pages/Project.tsx", "src/site/components/CnnDemo.tsx"] },
    { file: "projects/zhtml/index.html", assetRoot: "../../", sources: ["src/site/pages/Project.tsx"] },
    { file: "projects/oneserial/index.html", assetRoot: "../../", sources: ["src/site/pages/Project.tsx"] },
  ];
  for (const route of routes) {
    const scripts = new Set<string>();
    const styles = new Set<string>();
    for (const sourcePath of route.sources) {
      const resources = manifestStaticResources(siteManifest, sourcePath);
      resources.scripts.forEach(item => { if (!siteEntryScripts.has(item)) scripts.add(item); });
      resources.styles.forEach(item => styles.add(item));
    }
    const inlinedStyles = await Promise.all([...styles].map(async file => {
      const css = (await readFile(join(DOCS, file), "utf8"))
        .replace(/[ \t]+$/gm, "")
        .replaceAll("</style", "<\\/style");
      return '<style data-samey-route-style data-samey-style-src="' + htmlAttr(route.assetRoot + file) + '">' + css + "</style>";
    }));
    const preload = [
      ...inlinedStyles,
      ...[...scripts].map(file => '<link rel="modulepreload" crossorigin data-samey-route-module href="' + htmlAttr(route.assetRoot + file) + '">'),
    ].join("");
    const path = join(DOCS, route.file);
    let source = await readFile(path, "utf8");
    source = source.replace("</head>", preload + "</head>");
    await writeFile(path, source);
  }
  log("embedded route dependency hints in HTML");
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

async function publishSite() {
  await mkdir(DOCS, { recursive: true });
  // A partial site build updates an existing docs tree. Remove every output
  // owned by the site pipeline first, otherwise content-hashed Vite
  // chunks and deleted routes accumulate forever. Standalone Wordle/Keybr
  // artifacts are intentionally preserved unless their own target is built.
  const owned = [
    "index.html", "work", "tools", "chain",
    "blog", "projects", "site-app.js", "site-chunks", "assets", "shared",
    "site.css", "shared-runtime.js", "vditor",
  ];
  await Promise.all(owned.map(name => rm(join(DOCS, name), { recursive: true, force: true })));
  await cp(SITE_PUBLIC, DOCS, { recursive: true, force: true });
  await cp(GENERATED_SITE, DOCS, { recursive: true, force: true });
  await cp(GENERATED_SITE_RUNTIME, DOCS, { recursive: true, force: true });
  await cp(GENERATED_SHARED_RUNTIME, DOCS, { recursive: true, force: true });
  const vditorDist = join(ROOT, "node_modules/vditor/dist");
  const deployedVditor = join(DOCS, "vditor/dist");
  await mkdir(deployedVditor, { recursive: true });
  for (const directory of ["js", "css", "images"]) {
    await cp(join(vditorDist, directory), join(deployedVditor, directory), { recursive: true, force: true });
  }
  for (const file of ["index.css", "method.min.js"]) {
    await cp(join(vditorDist, file), join(deployedVditor, file), { force: true });
  }
  await mkdir(join(DOCS, "blog", "posts"), { recursive: true });
  await cp(join(GENERATED_BLOG_POST, "btop-mutex.html"), join(DOCS, "blog", "posts", "btop-mutex.html"), { force: true });
  await injectSitePreloadHints();
}

async function buildSharedRuntime() {
  await runViteBuild("shared");
  must(existsSync(join(GENERATED_SHARED_RUNTIME, "shared-runtime.js")), "shared runtime bundle missing");
  must(existsSync(join(GENERATED_SHARED_RUNTIME, "site.css")), "shared stylesheet bundle missing");
  log("shared TypeScript runtime/CSS -> .build/shared-runtime");
}

async function buildBlogPost() {
  await runViteBuild("blog");
  const candidates = await walk(GENERATED_BLOG_POST, (_path, name) => name === "btop-mutex.html");
  must(candidates.length === 1, `blog single-file build emitted ${candidates.length} btop-mutex.html files`);
  if (candidates[0] !== join(GENERATED_BLOG_POST, "btop-mutex.html")) await rename(candidates[0], join(GENERATED_BLOG_POST, "btop-mutex.html"));
  const html = await readFile(join(GENERATED_BLOG_POST, "btop-mutex.html"), "utf8");
  must(/<style(?:\s|>)/i.test(html) && /<script(?:\s|>)/i.test(html), "blog single-file build did not inline page-local CSS/JS");
  must(!html.includes("btop-lock.ts") && !html.includes("btop-mutex.css"), "blog page-local source references leaked into output");
  log("blog page-local TypeScript/CSS -> inline HTML");
}

async function buildSiteRuntime() {
  await runViteBuild("site");
  siteManifest = await readViteManifest(GENERATED_SITE_RUNTIME);
  const siteEntries = await walk(GENERATED_SITE_RUNTIME, (_path, name) => /^site-app-[A-Za-z0-9_-]+\.js$/.test(name));
  must(siteEntries.length === 1, `site runtime emitted ${siteEntries.length} hashed entry files`);
  await rm(join(GENERATED_SITE_RUNTIME, ".vite"), { recursive: true, force: true });
  log("site SPA -> .build/site-runtime");
}

async function buildWordle() {
  await runViteBuild("wordle");

  // Keep Vite's output-name semantics out of the deployment contract. Vite 8
  // runs closeBundle before its Rolldown writer is necessarily visible on disk,
  // so renaming app.html from a closeBundle hook races the output write. Build
  // into a private directory, then publish the single HTML artifact ourselves.
  const html = await walk(GENERATED_WORDLE, (_path, name) => name.endsWith(".html"));
  must(html.length === 1, `Wordle build emitted ${html.length} HTML files`);
  await mkdir(DOCS, { recursive: true });
  await rm(join(DOCS, "wordle.html"), { force: true });
  await rename(html[0], join(DOCS, "wordle.html"));
  must(existsSync(join(DOCS, "wordle.html")), "Wordle publish did not emit docs/wordle.html");
  log("wordle -> docs/wordle.html");
}



async function buildKeybr() {
  await runViteBuild("keybr");
  keybrManifest = await readViteManifest(GENERATED_KEYBR);
  const html = await walk(GENERATED_KEYBR, (_path, name) => name.endsWith(".html"));
  must(html.length === 1, `Keybr Vite build emitted ${html.length} HTML files`);
  let source = await readFile(html[0], "utf8");

  const entryScriptRe = /<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=["']([^"']+)["'])[^>]*><\/script>/i;
  const entryScriptMatch = source.match(entryScriptRe);
  must(entryScriptMatch?.[1], "Keybr HTML is missing its module entry script");
  const entryScriptHref = entryScriptMatch[1].replace(/^\.\//, "");
  must(/^keybr-assets\/index-[A-Za-z0-9_-]+\.js$/.test(entryScriptHref), "unexpected Keybr entry script: " + entryScriptHref);
  const entryScript = (await readFile(join(GENERATED_KEYBR, entryScriptHref), "utf8"))
    .replace(/(from\s*["']|import\s*["']|import\(\s*["'])\.\//g, "$1./keybr-assets/")
    .replaceAll("</script", "<\\/script");
  source = source.replace(entryScriptRe, '<script type="module" crossorigin data-keybr-entry>' + entryScript + "</script>");

  const stylesheetRe = /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const cssHrefs = [...source.matchAll(stylesheetRe)].map(match => match[1]).filter((href): href is string => typeof href === "string");
  const cssParts: string[] = [];
  for (const href of cssHrefs) {
    const local = href.replace(/^\.\//, "");
    must(local.startsWith("keybr-assets/") && local.endsWith(".css"), "unexpected Keybr stylesheet: " + href);
    cssParts.push((await readFile(join(GENERATED_KEYBR, local), "utf8")).replace(/[ \t]+$/gm, ""));
  }
  source = source.replace(stylesheetRe, "").replace(/^[ \t]+$/gm, "");
  const criticalCss = '<style data-keybr-page-css>' + cssParts.join("\n") + "</style>";

  const assetMap = (pattern: RegExp) => {
    const out: Record<string, string> = {};
    for (const [key, entry] of Object.entries(keybrManifest)) {
      const sourcePath = entry.src ?? key;
      const match = sourcePath.match(pattern);
      if (match?.[1]) out[match[1]] = "./" + entry.file;
    }
    return out;
  };
  const prefetchAssets = {
    models: assetMap(/(?:^|\/)model-(.+)\.data$/),
    words: assetMap(/(?:^|\/)words-(.+)\.json$/),
    books: assetMap(/(?:^|\/)books\/([^/]+)\.json$/),
  };
  must(prefetchAssets.models.en, "Keybr prefetch manifest is missing the English phonetic model");
  must(prefetchAssets.words.en, "Keybr prefetch manifest is missing the English word list");
  const prefetchData = '<script type="application/json" data-samey-prefetch-assets>' + jsonForHtml(prefetchAssets) + "</script>";
  const directPreload = '<script data-samey-keybr-preload>(function(){try{var n=document.querySelector("[data-samey-prefetch-assets]");if(!n)return;var m=JSON.parse(n.textContent||"{}"),s=JSON.parse(localStorage.getItem("settings")||"{}"),l=typeof s["keyboard.language"]==="string"?s["keyboard.language"]:"en",t=typeof s["lesson.type"]==="string"?s["lesson.type"]:"guided",u=[m.models&&m.models[l]];if(t==="guided"||t==="wordlist")u.push(m.words&&m.words[l]);else if(t==="books"){var b=typeof s["lesson.books.book"]==="string"?s["lesson.books.book"]:"en-alice-wonderland";u.push(m.books&&m.books[b])}for(var i=0;i<u.length;i++)if(u[i]){var a=document.createElement("link");a.rel="preload";a.as="fetch";a.href=u[i];a.crossOrigin="anonymous";document.head.append(a)}}catch(e){}})();</script>';
  const shared = '<link rel="icon" href="./favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="./site.css" data-samey-shared><script src="./shared-runtime.js"></script>';
  source = source.replace("</head>", criticalCss + prefetchData + directPreload + shared + "</head>");

  await mkdir(DOCS, { recursive: true });
  await writeFile(join(DOCS, "keybr.html"), source);
  const assets = join(GENERATED_KEYBR, "keybr-assets");
  must(existsSync(assets), "Keybr build did not emit split assets");
  await rm(join(DOCS, "keybr-assets"), { recursive: true, force: true });
  await cp(assets, join(DOCS, "keybr-assets"), { recursive: true, force: true });
  await rm(join(DOCS, entryScriptHref), { force: true });
  for (const href of cssHrefs) await rm(join(DOCS, href.replace(/^\.\//, "")), { force: true });
  log("keybr -> docs/keybr.html with inline entry/CSS + split dependency/data assets");
}

const PUBLIC_ORIGIN = "https://sanyambrar.com";
const exposesHtmlSuffix = (href: string, base = PUBLIC_ORIGIN + "/") => {
  try {
    const url = new URL(href, base);
    return url.origin === PUBLIC_ORIGIN && /\.html$/i.test(url.pathname);
  } catch {
    return false;
  }
};

async function validateExtensionlessPublicLinks() {
  for (const entry of [...games, ...posts, ...projects])
    must(!exposesHtmlSuffix(entry.href), `public link must not expose .html: ${entry.href}`);

  const htmlFiles = await walk(DOCS, (_path, name) => name.endsWith(".html"));
  for (const file of htmlFiles) {
    const source = await readFile(file, "utf8");
    const base = new URL(relative(DOCS, file).replaceAll("\\", "/"), PUBLIC_ORIGIN + "/").href;
    for (const match of source.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi))
      must(!exposesHtmlSuffix(match[1], base), `generated link must not expose .html in ${relative(DOCS, file)}: ${match[1]}`);
  }
  log("verified extensionless public links");
}

async function deployAssets() {
  return (await walk(DOCS, (_path, name) => /\.(?:html|css|js|wasm)$/.test(name) && name !== "sw.js"))
    .map((path) => relative(DOCS, path).replaceAll("\\", "/"))
    // Optional runtimes and Keybr chunks are cached on demand rather than
    // downloaded by every service-worker install. Their filenames are immutable.
    .filter(path => !path.startsWith("vditor/") && !path.startsWith("keybr-assets/"));
}

async function versionMutableShellReferences() {
  const siteEntries = await walk(join(DOCS, "site-chunks"), (_path, name) => /^site-app-[A-Za-z0-9_-]+\.js$/.test(name));
  must(siteEntries.length === 1, `deployment: expected one hashed site entry, found ${siteEntries.length}`);
  const siteEntry = relative(DOCS, siteEntries[0]).replaceAll("\\", "/");
  const mutableAssets = ["site.css", "shared-runtime.js"];
  const hash = createHash("sha256");
  hash.update(siteEntry).update("\0");
  for (const name of mutableAssets) hash.update(name).update("\0").update(await readFile(join(DOCS, name))).update("\0");
  const version = hash.digest("hex").slice(0, 16);
  const htmlFiles = await walk(DOCS, (_path, name) => name.endsWith(".html"));
  const mutableRef = /((?:href|src)=["'][^"']*(?:site\.css|shared-runtime\.js))(?:\?v=[^"']*)?(["'])/g;
  for (const file of htmlFiles) {
    let source = await readFile(file, "utf8");
    if (source.includes("data-site-spa"))
      source = source.replace(/site-app\.js(?:\?v=[^"']*)?/g, siteEntry);
    source = source.replace(mutableRef, `$1?v=${version}$2`);
    if (!/<meta\s+name=["']samey-build["']/i.test(source))
      source = source.replace(/<head>/i, `<head><meta name="samey-build" content="${version}">`);
    await writeFile(file, source);
  }
  for (const file of htmlFiles) {
    const source = await readFile(file, "utf8");
    const refs = [...source.matchAll(/(?:href|src)=["'][^"']*(?:site\.css|shared-runtime\.js)(?:\?[^"']*)?["']/g)].map(match => match[0]);
    must(refs.every(ref => ref.includes(`?v=${version}`)), `deployment: stale mutable shell reference remains in ${relative(DOCS, file)}`);
    must(!source.includes("site-app.js"), `deployment: mutable site-app reference remains in ${relative(DOCS, file)}`);
    if (source.includes("data-site-spa"))
      must(source.includes(siteEntry), `deployment: hashed site entry missing in ${relative(DOCS, file)}`);
    must(source.includes(`<meta name="samey-build" content="${version}">`), `deployment: missing build version in ${relative(DOCS, file)}`);
  }
  must(!existsSync(join(DOCS, "site-app.js")), "deployment: mutable site-app.js must not be emitted");
  log(`versioned mutable shell references -> ${version}; site entry -> ${siteEntry}`);
  return version;
}

async function generateServiceWorker() {
  const files = await deployAssets();
  const hash = createHash("sha256");
  for (const file of files) hash.update(file).update("\0").update(await readFile(join(DOCS, file))).update("\0");
  const version = hash.digest("hex").slice(0, 16);
  const source = `// Generated by build.ts. Do not edit.
const CACHE_PREFIX = 'samey-site-';
const CACHE = CACHE_PREFIX + '${version}';
const ROOT = new URL('./', self.registration.scope);
const CORE = ${JSON.stringify(files)};

const relativePath = request => {
  const url = new URL(request.url);
  return url.pathname.startsWith(ROOT.pathname) ? url.pathname.slice(ROOT.pathname.length) : '';
};
const immutableAsset = request => {
  const path = relativePath(request);
  return path.startsWith('site-chunks/') || path.startsWith('assets/') || path.startsWith('keybr-assets/');
};
const cacheKey = request => {
  const url = new URL(request.url);
  url.searchParams.delete('v');
  return url.href;
};
const cacheResponse = async (request, response) => {
  if (response.ok) (await caches.open(CACHE)).put(cacheKey(request), response.clone());
  return response;
};
const staleChunkResponse = request => new Response(
  'location.reload();\\nawait new Promise(() => {});\\n//# sourceURL=' + request.url,
  { status: 200, headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' } },
);
const fetchFresh = async request => {
  const response = await fetch(request);
  if ((response.status === 404 || response.status === 410) && immutableAsset(request) && new URL(request.url).pathname.endsWith('.js'))
    return staleChunkResponse(request);
  return cacheResponse(request, response);
};
const networkFirst = async request => {
  try { return await fetchFresh(request); }
  catch (error) {
    const cached = await (await caches.open(CACHE)).match(cacheKey(request));
    if (cached) return cached;
    throw error;
  }
};
const cacheFirstImmutable = async request => {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  return fetchFresh(request);
};

self.addEventListener('install', event => {
  event.waitUntil(Promise.all([
    caches.open(CACHE).then(cache => cache.addAll(CORE.map(path => new URL(path, ROOT)))),
    self.skipWaiting(),
  ]));
});

self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

const offlineNavigation = async request => {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const url = new URL(request.url);
  if (url.pathname.endsWith('/')) {
    const directoryIndex = await cache.match(new URL('index.html', url));
    if (directoryIndex) return directoryIndex;
  } else if (!url.pathname.split('/').pop()?.includes('.')) {
    const htmlPage = await cache.match(new URL(url.pathname + '.html', url.origin));
    if (htmlPage) return htmlPage;
    const directoryIndex = await cache.match(new URL(url.pathname + '/index.html', url.origin));
    if (directoryIndex) return directoryIndex;
  }
  return cache.match(new URL('index.html', ROOT));
};

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          (await caches.open(CACHE)).put(event.request, response.clone());
          return response;
        }
        return (await offlineNavigation(event.request)) || response;
      } catch { return offlineNavigation(event.request); }
    })());
    return;
  }
  // Only content-hashed Vite assets are cache-first. Mutable shell/runtime,
  // workers and WASM are network-first so a deployment cannot mix generations.
  event.respondWith(immutableAsset(event.request) ? cacheFirstImmutable(event.request) : networkFirst(event.request));
});
`;
  await writeFile(join(DOCS, "sw.js"), source);
}

async function main() {
  must(invalidTargets.length === 0, `unknown target: ${invalidTargets.join(", ")} (use wordle, keybr, site, or all)`);
  if (targets.has("site")) {
    await generateAppearance();
    await rm(GENERATED_SITE, { recursive: true, force: true });
    await generateSite(GENERATED_SITE);
    await Promise.all([buildSharedRuntime(), buildBlogPost(), buildSiteRuntime()]);
  }
  await beginDocsTransaction();
  if (targets.has("site")) await publishSite();
  const jobs: Promise<void>[] = [];
  if (targets.has("wordle")) jobs.push(buildWordle());
  if (targets.has("keybr")) jobs.push(buildKeybr());
  await Promise.all(jobs);
  await versionMutableShellReferences();
  await validateExtensionlessPublicLinks();
  await generateServiceWorker();
  if (fullBuild) log("build complete; docs/ is the GitHub Pages site root");
}

try {
  await main();
} catch (error) {
  await rollbackDocsTransaction();
  throw error;
} finally {
  await rm(join(ROOT, ".build"), { recursive: true, force: true });
}
