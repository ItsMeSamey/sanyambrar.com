import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
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
let appearanceBootstrapConfig: UnknownRecord | null = null;

const ROOT = import.meta.dirname;
const SITE_PUBLIC = join(ROOT, "src/site/public");
const DOCS = join(ROOT, "docs");
const GENERATED_SITE = join(ROOT, ".build", "site");
const GENERATED_SITE_RUNTIME = join(ROOT, ".build", "site-runtime");
const GENERATED_SITE_PRERENDER = join(ROOT, ".build", "site-prerender");
const GENERATED_SHARED_RUNTIME = join(ROOT, ".build", "shared-runtime");
const GENERATED_BLOG_POST = join(ROOT, ".build", "blog-post");
const GENERATED_SEALED_POST = join(ROOT, ".build", "sealed-post");
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
const siteShell = (title: string, kind: string, root = "./") => `<!doctype html><html lang="en" data-site-spa data-site-kind="${kind}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark"><title>${title}</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${root}site.css" data-samey-shared><script src="${root}shared-runtime.js"></script><script type="module" src="${root}site-app.js"></script></head><body><div id="site-root"></div></body></html>`;

type SiteRoute = {
  path: string;
  href: string;
  file: string;
  title: string;
  kind: string;
  assetRoot: string;
  sources: string[];
  prerender: boolean;
};
const routeAssetRoot = (path: string) => path ? "../".repeat(path.split("/").length) : "./";
const siteRoute = (
  path: string,
  title: string,
  kind: string,
  sources: string[],
  prerender = false,
): SiteRoute => ({
  path,
  href: path ? `/${path}/` : "/",
  file: path ? `${path}/index.html` : "index.html",
  title,
  kind,
  assetRoot: routeAssetRoot(path),
  sources,
  prerender,
});
const PROJECT_DEMO_SOURCES = {
  "reverb-ui": "src/site/components/ReverbDemo.tsx",
  "cnn-draw": "src/site/components/CnnDemo.tsx",
} as const;
const SITE_ROUTES: SiteRoute[] = [
  siteRoute("", "Sanyam Brar", "home", ["src/site/pages/Home.tsx"], true),
  siteRoute("work", "Work · Sanyam Brar", "work", ["src/site/pages/Work.tsx"], true),
  siteRoute("tools", "Tools · Sanyam Brar", "tools", ["src/tools/Tools.tsx"], true),
  siteRoute("chain", "Chain Reaction", "chain", ["src/games/chain/Chain.tsx"], true),
  siteRoute("blog", "Writing · Sanyam Brar", "blog", ["src/blogs/Blog.tsx"], true),
  ...Object.entries(details).map(([slug, detail]) => siteRoute(
    `projects/${slug}`,
    `${detail.title} · Sanyam Brar`,
    "project",
    ["src/site/pages/Project.tsx", ...(detail.demo ? [PROJECT_DEMO_SOURCES[detail.demo]] : [])],
    true,
  )),
];

async function generateSite(root: string) {
  await Promise.all(SITE_ROUTES.map(async route => {
    const file = join(root, route.file);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, siteShell(route.title, route.kind, route.assetRoot));
  }));
}

type SitePrerenderModule = { prerenderSiteRoute?: (href: string) => Promise<string> };

async function injectSitePrerender() {
  const module = await import(pathToFileURL(join(GENERATED_SITE_PRERENDER, "prerender.js")).href) as SitePrerenderModule;
  const prerender = module.prerenderSiteRoute;
  must(typeof prerender === "function", "site prerender bundle is missing prerenderSiteRoute");
  for (const route of SITE_ROUTES.filter(route => route.prerender)) {
    const markup = await prerender(new URL(route.href, PUBLIC_ORIGIN).href);
    must(markup.includes('id="solid-site-app"'), "site prerender root missing for " + route.href);
    must(!markup.includes("site-fatal-shell"), "site prerender rendered the fatal shell for " + route.href);
    must(!markup.includes("<script"), "site prerender unexpectedly emitted a script for " + route.href);
    const path = join(GENERATED_SITE, route.file);
    let source = await readFile(path, "utf8");
    const emptyRoot = '<div id="site-root"></div>';
    must(source.includes(emptyRoot), "site prerender target root missing in " + route.file);
    source = source.replace(emptyRoot, () => '<div id="site-root" data-samey-prerendered>' + markup + '</div>');
    await writeFile(path, source);
  }
  log("prerendered static Solid route shells");
}

async function runViteBuild(target: "wordle" | "keybr" | "site" | "site-prerender" | "blog" | "sealed" | "shared") {
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
  appearanceBootstrapConfig = config;
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
const escapeInlineScript = (source: string) => source.replaceAll("</script", "<\\/script");
const inlineModuleSpecifier = /\b(from\s*|import\s*(?:\(\s*)?)(["'`])(\.{1,2}\/[^"'`]+)\2/g;
const resolvedModuleFile = (file: string, specifier: string) =>
  new URL(specifier, new URL("/" + file, PUBLIC_ORIGIN)).pathname.replace(/^\//, "");
const embeddedAssetUrl = /new URL\(\s*(["'`])([^"'`$]+)\1\s*,\s*(?:``\s*\+\s*)?import\.meta\.url\s*\)/g;
const rewriteEmbeddedModuleSource = (source: string, file: string) => {
  const importsRewritten = source.replace(
    inlineModuleSpecifier,
    (_match, prefix: string, _quote: string, specifier: string) => {
      const target = resolvedModuleFile(file, specifier);
      const dynamic = prefix.trim().startsWith("import") && prefix.includes("(");
      must(dynamic, `embedded module ${file} has unexpected static dependency: ${target}`);
      return 'import(new URL(' + JSON.stringify('/' + target) + ',location.origin).href';
    },
  );
  return importsRewritten.replace(embeddedAssetUrl, (_match, _quote: string, specifier: string) => {
    const target = specifier.startsWith('/') ? specifier : '/' + resolvedModuleFile(file, specifier);
    return 'new URL(' + JSON.stringify(target) + ',location.origin)';
  });
};
const inlineThemeBootstrapTag = /<script\b[^>]*data-samey-theme-bootstrap[^>]*>[\s\S]*?<\/script>/i;

function earlyThemeBootstrap() {
  const config = appearanceBootstrapConfig;
  must(config, "appearance bootstrap config is unavailable");
  const colors = requireRecord(config.colors, "appearance bootstrap colors are unavailable");
  const palette: Record<string, { tone: string; background: string; text: string }> = {};
  for (const [id, value] of Object.entries(colors)) {
    if (!isRecord(value)) continue;
    const tone = value.tone === "dark" ? "dark" : "light";
    const background = typeof value.background === "string" ? value.background : tone === "dark" ? "#121213" : "#ffffff";
    const text = typeof value.text === "string" ? value.text : tone === "dark" ? "#f8f8f8" : "#121213";
    palette[id] = { tone, background, text };
  }
  const script = `(function(){try{var p=${jsonForHtml(palette)},r=JSON.parse(localStorage.getItem("keybr.theme")||"null")||{},v=r.color||"system";if(v==="light-contrast"||v==="clear-light"||["gray","yellow","garden","coffee","honey"].includes(v))v="light";else if(v==="dark-contrast")v="clear-dark";else if(v==="chocolate")v="dark";var t;if(v==="custom")t=r.custom;else if(typeof v==="string"&&v.indexOf("saved:")===0&&Array.isArray(r.savedThemes)){var id=v.slice(6);t=r.savedThemes.find(function(x){return x&&x.id===id})}else if(v==="system")t=p[matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"];else t=p[v];if(!t)t=p[matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"]||p.light;var hex=function(x){return typeof x==="string"&&/^#[0-9a-f]{6}$/i.test(x)},tone=t&&t.tone==="dark"?"dark":"light",bg=hex(t&&t.background)?t.background:(tone==="dark"?"#121213":"#ffffff"),fg=hex(t&&t.text)?t.text:(tone==="dark"?"#f8f8f8":"#121213"),e=document.documentElement;e.dataset.siteTheme=v;e.dataset.kbTheme=tone;e.dataset.color=v;e.classList.toggle("dark",tone==="dark");e.style.colorScheme=tone;e.style.setProperty("--site-bg",bg);e.style.setProperty("--site-fg",fg);e.style.backgroundColor=bg;e.style.color=fg}catch(e){}})();`;
  return '<script data-samey-theme-bootstrap>' + escapeInlineScript(script) + '</script>';
}

async function injectSitePreloadHints() {
  const siteEntryResources = manifestStaticResources(siteManifest, "src/site/main.tsx");
  const siteEntryScripts = new Set(siteEntryResources.scripts);
  const routeStyles = new Map<string, Set<string>>();
  for (const route of SITE_ROUTES) {
    const scripts = new Set<string>();
    const styles = new Set<string>();
    for (const sourcePath of route.sources) {
      const resources = manifestStaticResources(siteManifest, sourcePath);
      resources.scripts.forEach(item => { if (!siteEntryScripts.has(item)) scripts.add(item); });
      resources.styles.forEach(item => styles.add(item));
    }
    const styleUrls = [...styles].map(file => "/" + file);
    const sharedKindStyles = routeStyles.get(route.kind) ?? new Set<string>();
    styleUrls.forEach(file => sharedKindStyles.add(file));
    routeStyles.set(route.kind, sharedKindStyles);
    const preload = [
      ...styleUrls.map(file => '<link rel="stylesheet" data-samey-route-style data-samey-route-owner="' + htmlAttr(route.kind) + '" href="' + htmlAttr(file) + '">'),
      '<meta name="samey-route-assets" content="/shared/site-routes.json">',
      ...[...scripts].map(file => '<link rel="modulepreload" crossorigin data-samey-route-module href="' + htmlAttr(route.assetRoot + file) + '">'),
    ].join("");
    const path = join(DOCS, route.file);
    let source = await readFile(path, "utf8");
    source = source.replace("</head>", preload + "</head>");
    await writeFile(path, source);
  }
  await mkdir(join(DOCS, "shared"), { recursive: true });
  await writeFile(join(DOCS, "shared", "site-routes.json"), JSON.stringify(Object.fromEntries([...routeStyles].map(([kind, files]) => [kind, [...files]]))));
  log("linked route styles and emitted shared route asset manifest");
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
  await cp(join(GENERATED_BLOG_POST, "btop-mutex.html"), join(DOCS, "blog", "1.html"), { force: true });
  await cp(join(GENERATED_SEALED_POST, "index.html"), join(DOCS, "blog", "2", "index.html"), { force: true });
  await cp(join(GENERATED_SEALED_POST, "index.html"), join(DOCS, "blog", "2.html"), { force: true });
  const redirect = (target: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="referrer" content="no-referrer"><title>Redirecting</title><link rel="stylesheet" href="/site.css" data-samey-shared><script src="/shared-runtime.js"></script><script>location.replace(${JSON.stringify(target)}+location.search+location.hash)</script></head><body><a href="${target}">Continue</a></body></html>`;
  await mkdir(join(DOCS, "blog", "sealed"), { recursive: true });
  await writeFile(join(DOCS, "blog", "sealed", "index.html"), redirect('/blog/2'));
  await writeFile(join(DOCS, "blog", "posts", "btop-mutex.html"), redirect('/blog/1'));
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

async function buildSealedPost() {
  await runViteBuild("sealed");
  const candidates = await walk(GENERATED_SEALED_POST, (_path, name) => name === "index.html");
  must(candidates.length === 1, "private reader build must emit one HTML entry");
  const destination = join(GENERATED_SEALED_POST, "index.html");
  if (candidates[0] !== destination) await rename(candidates[0], destination);
  const html = await readFile(destination, "utf8");
  must(!html.includes("article-chrome.tsx"), "private reader shell was not compiled");
}

async function buildSitePrerender() {
  await runViteBuild("site-prerender");
  must(existsSync(join(GENERATED_SITE_PRERENDER, "prerender.js")), "site prerender bundle missing");
  log("site prerender renderer -> .build/site-prerender");
}

async function buildWordle() {
  await runViteBuild("wordle");

  // Keep Vite's output-name semantics out of the deployment contract. Vite 8
  // runs closeBundle before its Rolldown writer is necessarily visible on disk,
  // so renaming app.html from a closeBundle hook races the output write. Build
  // into a private directory, then publish the single HTML artifact ourselves.
  const html = await walk(GENERATED_WORDLE, (_path, name) => name.endsWith(".html"));
  must(html.length === 1, `Wordle build emitted ${html.length} HTML files`);
  let source = await readFile(html[0], "utf8");
  const routeStyleRe = /<style\b[^>]*>[\s\S]*?<\/style>/gi;
  const routeStyles = [...source.matchAll(routeStyleRe)].map(match => match[0]);
  must(routeStyles.length > 0, "Wordle build emitted no route stylesheet");
  source = source.replace(routeStyleRe, "");
  const taggedRouteStyles = routeStyles
    .map(style => style.replace(/^<style\b/i, '<style data-wordle-page-css'))
    .join("");

  const moduleScriptRe = /<script\b(?=[^>]*\btype=["']module["'])[^>]*>[\s\S]*?<\/script>/i;
  const moduleScript = source.match(moduleScriptRe)?.[0];
  must(moduleScript, "Wordle build emitted no application module script");
  source = source.replace(moduleScriptRe, "");
  source = source.replace("</head>", () => taggedRouteStyles + "</head>");
  source = source.replace("</body>", () => moduleScript + "</body>");
  source = source.replace(/[ \t]+$/gm, "");

  await mkdir(DOCS, { recursive: true });
  await rm(join(DOCS, "wordle.html"), { force: true });
  await writeFile(join(DOCS, "wordle.html"), source);
  must(existsSync(join(DOCS, "wordle.html")), "Wordle publish did not emit docs/wordle.html");
  log("wordle -> docs/wordle.html with route CSS before the static shell and deferred app module at body end");
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
  const startupResources = manifestStaticResources(keybrManifest, "index.html");
  const startupModules = new Set(startupResources.scripts);
  must(startupModules.size === 1 && startupModules.has(entryScriptHref),
    "Keybr startup JS must be one consolidated entry bundle");
  const entryScript = escapeInlineScript(rewriteEmbeddedModuleSource(
    await readFile(join(GENERATED_KEYBR, entryScriptHref), "utf8"),
    entryScriptHref,
  ));
  source = source.replace(entryScriptRe, () => '<script type="module" data-keybr-entry>' + entryScript + "</script>");
  source = source.replace(/<link\b[^>]*\brel=["']modulepreload["'][^>]*>/gi, "");

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
  source = source.replace("</head>", () => criticalCss + prefetchData + directPreload + shared + "</head>");

  await mkdir(DOCS, { recursive: true });
  await writeFile(join(DOCS, "keybr.html"), source);
  const assets = join(GENERATED_KEYBR, "keybr-assets");
  must(existsSync(assets), "Keybr build did not emit split assets");
  await rm(join(DOCS, "keybr-assets"), { recursive: true, force: true });
  await cp(assets, join(DOCS, "keybr-assets"), { recursive: true, force: true });
  for (const file of startupModules) await rm(join(DOCS, file), { force: true });
  for (const href of cssHrefs) await rm(join(DOCS, href.replace(/^\.\//, "")), { force: true });
  log("keybr -> docs/keybr.html with one inline startup bundle/CSS + lazy data/media assets");
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
  return (await walk(DOCS, (_path, name) => /\.(?:html|css|js|json|wasm)$/.test(name) && name !== "sw.js"))
    .map((path) => relative(DOCS, path).replaceAll("\\", "/"))
    // Optional runtimes are cached when used. Visiting another page must not
    // download the Chain Reaction model, inference runtime, or worker.
    .filter(path => path !== "blog/2.html" && !path.startsWith("blog/2/") && !path.startsWith("vditor/") && !path.startsWith("keybr-assets/") &&
      !/^assets\/(?:ort[.-]|chain-opponent[.-])/.test(path));
}

async function finalizeShellAssets() {
  const siteEntries = await walk(join(DOCS, "site-chunks"), (_path, name) => /^site-app-[A-Za-z0-9_-]+\.js$/.test(name));
  must(siteEntries.length === 1, `deployment: expected one hashed site entry, found ${siteEntries.length}`);
  const siteEntry = relative(DOCS, siteEntries[0]).replaceAll("\\", "/");
  const sharedCss = await readFile(join(GENERATED_SHARED_RUNTIME, "site.css"), "utf8");
  const sharedRuntime = await readFile(join(GENERATED_SHARED_RUNTIME, "shared-runtime.js"), "utf8");
  const transitionBridge = await readFile(join(ROOT, "src/shared/transition-bridge.js"), "utf8");
  const digest = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex").slice(0, 16);
  const cssHash = digest(sharedCss);
  const runtimeHash = digest(sharedRuntime);
  const sharedDir = join(DOCS, "shared");
  await mkdir(sharedDir, { recursive: true });
  const sharedCssName = `site-${cssHash}.css`;
  const sharedRuntimeName = `runtime-${runtimeHash}.js`;
  const transitionBridgeName = `transition-bridge-${digest(transitionBridge)}.js`;
  await writeFile(join(sharedDir, sharedCssName), sharedCss);
  await writeFile(join(sharedDir, sharedRuntimeName), sharedRuntime);
  await writeFile(join(sharedDir, transitionBridgeName), transitionBridge);

  const mutableRouteManifest = join(sharedDir, "site-routes.json");
  let routeManifestName = "";
  if (existsSync(mutableRouteManifest)) {
    const routeManifest = await readFile(mutableRouteManifest, "utf8");
    routeManifestName = `site-routes-${digest(routeManifest)}.json`;
    await writeFile(join(sharedDir, routeManifestName), routeManifest);
    await rm(mutableRouteManifest, { force: true });
  } else {
    const existing = await walk(sharedDir, (_path, name) => /^site-routes-[0-9a-f]{16}\.json$/.test(name));
    must(existing.length === 1, `deployment: expected one hashed route asset manifest, found ${existing.length}`);
    routeManifestName = relative(sharedDir, existing[0]).replaceAll("\\", "/");
  }

  const hash = createHash("sha256");
  hash.update(siteEntry).update("\0").update(sharedCssName).update("\0").update(sharedRuntimeName).update("\0").update(transitionBridgeName).update("\0").update(routeManifestName);
  const version = hash.digest("hex").slice(0, 16);
  const htmlFiles = await walk(DOCS, (_path, name) => name.endsWith(".html"));
  const sharedStyleTag = /<link\b[^>]*\bdata-samey-shared\b[^>]*>/i;
  const sharedRuntimeTag = /<script\b(?:[^>]*\bdata-samey-shared-runtime\b[^>]*|[^>]*\bsrc=["'][^"']*shared-runtime\.js(?:\?[^"']*)?["'][^>]*)><\/script>/i;
  const transitionBridgeTag = /<script\b[^>]*\bdata-samey-transition-bridge\b[^>]*><\/script>/i;
  const themeBootstrap = earlyThemeBootstrap();
  for (const file of htmlFiles) {
    let source = await readFile(file, "utf8");
    if (inlineThemeBootstrapTag.test(source)) source = source.replace(inlineThemeBootstrapTag, () => themeBootstrap);
    else source = source.replace(/<head>/i, () => "<head>" + themeBootstrap);
    if (!source.includes('data-samey-view-transition'))
      source = source.replace('</head>', '<style data-samey-view-transition>@view-transition{navigation:auto}</style></head>');
    const spaShell = /<html\b[^>]*\bdata-site-spa(?:\s|>|=)/i.test(source);
    if (spaShell)
      source = source.replace(/site-app\.js(?:\?v=[^"']*)?/g, siteEntry);
    const styleMatch = sharedStyleTag.exec(source);
    const runtimeMatch = sharedRuntimeTag.exec(source);
    must(!!styleMatch === !!runtimeMatch, `deployment: incomplete shared shell assets in ${relative(DOCS, file)}`);
    if (styleMatch && runtimeMatch) {
      source = source.replace(sharedStyleTag, () => `<link rel="stylesheet" data-samey-shared href="/shared/${sharedCssName}">`);
      source = source.replace(sharedRuntimeTag, () => `<script defer data-samey-shared-runtime data-samey-runtime-root="/" data-samey-build="${version}" src="/shared/${sharedRuntimeName}"></script>`);
    }
    const transitionBridge = `<script data-samey-transition-bridge src="/shared/${transitionBridgeName}"></script>`;
    if (transitionBridgeTag.test(source)) source = source.replace(transitionBridgeTag, () => transitionBridge);
    else source = source.replace('</head>', () => transitionBridge + '</head>');
    if (spaShell)
      source = source.replace(/<meta\s+name=["']samey-route-assets["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="samey-route-assets" content="/shared/${routeManifestName}">`);
    const buildMeta = /<meta\s+name=["']samey-build["']\s+content=["'][^"']*["']\s*\/?>/i;
    if (buildMeta.test(source))
      source = source.replace(buildMeta, `<meta name="samey-build" content="${version}">`);
    else source = source.replace(/<head>/i, `<head><meta name="samey-build" content="${version}">`);
    await writeFile(file, source);
  }
  for (const file of htmlFiles) {
    const source = await readFile(file, "utf8");
    const spaShell = /<html\b[^>]*\bdata-site-spa(?:\s|>|=)/i.test(source);
    const siteKindShell = /<html\b[^>]*\bdata-site-kind\s*=/i.test(source);
    must(source.includes(`href="/shared/${sharedCssName}"`), `deployment: hashed shared CSS missing in ${relative(DOCS, file)}`);
    must(source.includes(`src="/shared/${sharedRuntimeName}"`), `deployment: hashed shared runtime missing in ${relative(DOCS, file)}`);
    must(source.includes(`src="/shared/${transitionBridgeName}"`), `deployment: hashed transition bridge missing in ${relative(DOCS, file)}`);
    must(!source.includes("site-app.js"), `deployment: mutable site-app reference remains in ${relative(DOCS, file)}`);
    if (spaShell)
      must(source.includes(siteEntry), `deployment: hashed site entry missing in ${relative(DOCS, file)}`);
    if (siteKindShell) {
      must(source.includes("data-samey-shared-runtime"), `deployment: inline shared runtime missing in ${relative(DOCS, file)}`);
    }
    if (spaShell)
      must(source.includes(`/shared/${routeManifestName}`), `deployment: hashed route manifest missing in ${relative(DOCS, file)}`);
    must(source.includes(`<meta name="samey-build" content="${version}">`), `deployment: missing build version in ${relative(DOCS, file)}`);
  }
  for (const file of await readdir(sharedDir)) {
    if (file === sharedCssName || file === sharedRuntimeName || file === transitionBridgeName || file === routeManifestName) continue;
    if (/^(?:site-[0-9a-f]{16}\.css|runtime-[0-9a-f]{16}\.js|transition-bridge-[0-9a-f]{16}\.js|site-routes-[0-9a-f]{16}\.json)$/.test(file))
      await rm(join(sharedDir, file), { force: true });
  }
  await Promise.all([
    rm(join(DOCS, "site.css"), { force: true }),
    rm(join(DOCS, "shared-runtime.js"), { force: true }),
  ]);
  must(!existsSync(join(DOCS, "site-app.js")), "deployment: mutable site-app.js must not be emitted");
  must(existsSync(join(sharedDir, sharedCssName)) && existsSync(join(sharedDir, sharedRuntimeName)), "deployment: hashed shared shell assets are missing");
  log(`linked hashed shared shell assets -> ${version}; site entry -> ${siteEntry}`);
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
  return path.startsWith('site-chunks/') || path.startsWith('assets/') || path.startsWith('keybr-assets/') || path.startsWith('shared/');
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
  await generateAppearance();
  const sharedBuild = buildSharedRuntime();
  if (targets.has("site")) {
    await rm(GENERATED_SITE, { recursive: true, force: true });
    await generateSite(GENERATED_SITE);
    await Promise.all([sharedBuild, buildBlogPost(), buildSealedPost(), buildSiteRuntime(), buildSitePrerender()]);
    await injectSitePrerender();
  } else await sharedBuild;
  await beginDocsTransaction();
  if (targets.has("site")) await publishSite();
  const jobs: Promise<void>[] = [];
  if (targets.has("wordle")) jobs.push(buildWordle());
  if (targets.has("keybr")) jobs.push(buildKeybr());
  await Promise.all(jobs);
  await finalizeShellAssets();
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
