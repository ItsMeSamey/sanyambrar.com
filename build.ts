import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdir, readFile, readdir, rename, rm, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { promisify } from "node:util";
import { generateSite } from "./site.ts";

const runFile = promisify(execFile);

const ROOT = import.meta.dirname;
const STATIC = join(ROOT, "src/static");
const DOCS = join(ROOT, "docs");
const GENERATED_SITE = join(ROOT, ".build", "site");
const GENERATED_SITE_RUNTIME = join(ROOT, ".build", "site-runtime");
const GENERATED_SHARED_RUNTIME = join(ROOT, ".build", "shared-runtime");
const GENERATED_BLOG_POST = join(ROOT, ".build", "blog-post");
const GENERATED_WORDLE = join(ROOT, ".build", "wordle");
const GENERATED_KEYBR = join(ROOT, ".build", "keybr");
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

  const installArgs = existsSync(lock) ? ["install", "--frozen-lockfile"] : ["install"];
  try {
    await run(dir, process.execPath, installArgs);
  } catch (error: any) {
    if (error?.code === "ENOENT" && !existsSync(process.execPath))
      throw new Error(`dependencies for ${relative(ROOT, dir) || "."} are missing/stale and Bun is not installed`);

    // Bun can leave a partially-populated package cache/tree after an
    // interrupted install. A common symptom is ENOENT while linking a package
    // binary (for example TypeScript's bin/tsc). Retry once from clean inputs,
    // bypassing both the cache and hardlink backend.
    const detail = `${error?.message || ""}\n${error?.stderr || ""}`;
    if (!/ENOENT: (?:copying|linking) file/i.test(detail)) throw error;
    log(`dependency install hit a stale package tree; retrying cleanly for ${relative(ROOT, dir) || "."}`);
    await rm(join(dir, "node_modules"), { recursive: true, force: true });
    await run(dir, process.execPath, [...installArgs, "--no-cache", "--backend=copyfile"]);
  }
  await mkdir(join(dir, "node_modules"), { recursive: true });
  must(await directDependenciesPresent(dir), `dependencies for ${relative(ROOT, dir) || "."} are incomplete after install`);
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

async function verifySourceArchitecture() {
  for (const dir of ["src/games", "src/tools", "src/blogs", "src/static", "src/games/keybr"])
    must(existsSync(join(ROOT, dir)), `architecture: missing ${dir}`);
  must(!existsSync(join(ROOT, "keybr")) && !existsSync(join(ROOT, "static")),
    "architecture: Keybr/static sources must live under src/");
  for (const file of ["TextTool.tsx", "EncodeTool.tsx", "DiffTool.tsx", "NumbersTool.tsx", "MarkdownTool.tsx"])
    must(existsSync(join(ROOT, "src/tools", file)), `architecture: missing src/tools/${file}`);
  const sourceFiles = await walk(join(ROOT, "src"), (_path, name) => /\.(?:ts|tsx|html|css)$/.test(name));
  const sources = await Promise.all(sourceFiles.map(async path => [path, await readFile(path, "utf8")] as const));
  const topBarImplementations = sources.filter(([, text]) => text.includes('<header class="site-topbar">'));
  must(topBarImplementations.length === 1 && relative(ROOT, topBarImplementations[0][0]) === "src/shared/components/TopBar.tsx",
    `architecture: expected exactly one TopBar implementation, found ${topBarImplementations.map(([path]) => relative(ROOT, path)).join(", ") || "none"}`);

  const retiredBars = ["tools-subbar", "wordle-context-bar", "chain-context-bar", "article-back-wrap"];
  for (const name of retiredBars) {
    const hits = sources.filter(([, text]) => text.includes(name)).map(([path]) => relative(ROOT, path));
    must(hits.length === 0, `architecture: retired duplicate bar ${name} remains in ${hits.join(", ")}`);
  }

  const viteConfigs = await Promise.all(
    ["vite.config.ts", "vite.blog.config.ts", "vite.shared.config.ts", "vite.site.config.ts", "src/games/keybr/vite.config.ts"]
      .map(async name => [name, await readFile(join(ROOT, name), "utf8")] as const),
  );
  const keybrPackage = JSON.parse(await readFile(join(ROOT, "src/games/keybr/package.json"), "utf8"));
  const keybrDeps = { ...(keybrPackage.dependencies || {}), ...(keybrPackage.devDependencies || {}) };
  must(!("react" in keybrDeps) && !("react-dom" in keybrDeps) && !("react-intl" in keybrDeps), "architecture: Keybr must not depend on React");
  must(!Object.keys(keybrDeps).some(name => name.includes("webpack")), "architecture: Keybr must not depend on Webpack");
  const keybrPackagesDir = join(ROOT, "src/games/keybr/packages");
  for (const entry of await readdir(keybrPackagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(keybrPackagesDir, entry.name, "package.json");
    if (!existsSync(file)) continue;
    const pkg = JSON.parse(await readFile(file, "utf8"));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}), ...(pkg.peerDependencies || {}) };
    must(!("react" in deps) && !("react-dom" in deps) && !("react-intl" in deps), `architecture: ${relative(ROOT, file)} must not depend on React`);
  }
  const keybrEntry = await readFile(join(ROOT, "src/games/keybr/src/main.tsx"), "utf8");
  const keybrApp = await readFile(join(ROOT, "src/games/keybr/packages/keybr-app/lib/App.tsx"), "utf8");
  const keybrViewSwitch = await readFile(join(ROOT, "src/games/keybr/packages/keybr-widget/lib/components/view/ViewSwitch.tsx"), "utf8");
  const keybrSolidRuntime = `${keybrEntry}
${keybrApp}
${keybrViewSwitch}`;
  must(keybrSolidRuntime.includes('from "solid-js"') && keybrSolidRuntime.includes('from "solid-js/web"'), "architecture: Keybr must use SolidJS");
  must(!sources.some(([, text]) => /@mdi\/|material-symbol|material-icons/.test(text)),
    "architecture: UI icons must use Lucide rather than mixed Material/MDI sets");
  const wordleVite = viteConfigs[0][1];
  must(!wordleVite.includes("closeBundle") && wordleVite.includes(".build/wordle"),
    "architecture: Wordle Vite build must stage output privately; build.ts owns publication");
  for (const [name, text] of viteConfigs)
    must(!text.includes("rollupOptions"), `architecture: ${name} uses deprecated Vite rollupOptions`);

  const transitions = await readFile(join(ROOT, "src/shared/transitions.ts"), "utf8");
  must(/duration:\s*\d+/.test(transitions) && !/enterDuration:|leaveDuration:/.test(transitions),
    "architecture: page transition timing must come from PAGE_TRANSITION.duration");
  must((await readFile(join(ROOT, "src/site/App.tsx"), "utf8")).includes("animateRootSwap"),
    "architecture: Solid routes must use the shared transition runtime");
  must((await readFile(join(ROOT, "src/games/wordle/page.tsx"), "utf8")).includes("animateRootSwap"),
    "architecture: Wordle views must use the shared transition runtime");
  must((await readFile(join(ROOT, "src/games/chain/chain.ts"), "utf8")).includes("animateMountedViewSwap"),
    "architecture: Chain views must use the shared transition runtime");
  must(keybrSolidRuntime.includes("SameyAnimateLocalSwap"),
    "architecture: Keybr views must use the shared transition runtime");

  // UX contracts that are easy to regress because desktop and narrow layouts
  // intentionally diverge. Keep these assertions close to the build so every
  // published archive verifies the requested navigation/editing behavior.
  const wordlePage = await readFile(join(ROOT, "src/games/wordle/page.tsx"), "utf8");
  const wordleStats = await readFile(join(ROOT, "src/games/wordle/page_stats.tsx"), "utf8");
  const wordleStyle = await readFile(join(ROOT, "src/games/wordle/style.css"), "utf8");
  must(wordlePage.includes("context={showOpening() ? <span class='wordle-topbar-actions'><StatsPageTrigger /></span>"),
    "ux: Wordle opening screen must expose Statistics directly");
  const wordleBrand = await readFile(join(ROOT, "src/shared/components/Brand.tsx"), "utf8");
  must(wordleStats.includes("<WordleMark text='<WORDLE'") && !wordleStats.includes(">Wordle</BackLink>") && !wordleStats.includes("HomeBrand"),
    "ux: Wordle Statistics must have one Wordle-cell back control to the picker");
  must(wordlePage.includes("class='wordle-back-wordmark'") && !wordlePage.includes("MODES") && !wordlePage.includes("result-board") && !wordleStyle.includes(".result-board"),
    "ux: Wordle subpages must render boxed <WORDLE cells and completion must not render a recap board");
  must(wordleBrand.includes("colors:readonly string[]") && wordleBrand.includes("props.colors[index % props.colors.length]"),
    "architecture: Wordle text rendering must be centralized and accept per-cell colors");
  must(wordleStyle.includes("--wordle-key-neutral: color-mix(in srgb,var(--site-fg") &&
    wordleStyle.includes("var(--site-error") && wordleStyle.includes("var(--site-warning-color") &&
    wordleStyle.includes("var(--site-fast-color") && wordleStyle.includes("var(--site-effort-color") &&
    wordleStyle.includes(".stats-page") && wordleStyle.includes("var(--color-background)") &&
    wordleStyle.includes(".wordle-key-pressed{filter:none") && !wordleStyle.includes("filter:invert(1)"),
    "ux: Wordle keyboard, game states, and subpage surfaces must derive from the site theme");

  const chainPage = await readFile(join(ROOT, "src/games/chain/Chain.tsx"), "utf8");
  const chainEngine = await readFile(join(ROOT, "src/games/chain/chain.ts"), "utf8");
  const chainLogo = await readFile(join(ROOT, "src/shared/components/ChainLogo.tsx"), "utf8");
  must(chainPage.includes('id="chain-stats-button"') && chainPage.includes('id="chain-stats"') && chainEngine.includes("samey.chain.stats.v2"),
    "ux: Chain Reaction must expose persistent statistics");
  must(chainPage.includes('id="chain-stats-back"') && chainLogo.includes("const BACK_ROWS"),
    "ux: Chain Statistics must use the Chain back mark");
  must(chainPage.includes('id="chain-replay-canvas"') && chainPage.includes('id="chain-replay-play"') &&
    chainEngine.includes("moveHistory.push(encodeMove(owner, start))") && chainEngine.includes("buildReplayFrames") &&
    chainEngine.includes("LEGACY_STATS_KEY"),
    "ux: Chain statistics must persist player move locations and replay completed matches");
  must(chainEngine.includes("const PAGE_QUERY = 'p'") && chainEngine.includes("addEventListener('popstate', onPopState)") && chainEngine.includes("url.searchParams.set(PAGE_QUERY, page)"),
    "ux: Chain subpages must round-trip through query-string history");
  must(keybrViewSwitch.includes('searchParams.get("p")') && keybrViewSwitch.includes('history.pushState') && keybrViewSwitch.includes('addEventListener("popstate", onPopState)'),
    "ux: Keybr subpages must round-trip through query-string history");
  const keybrSettingsScreen = await readFile(join(ROOT, "src/games/keybr/packages/page-practice/lib/settings/SettingsScreen.tsx"), "utf8");
  const keybrLessonLoader = await readFile(join(ROOT, "src/games/keybr/packages/keybr-lesson-loader/lib/LessonLoader.tsx"), "utf8");
  const keybrTabList = await readFile(join(ROOT, "src/games/keybr/packages/keybr-widget/lib/components/tablist/TabList.tsx"), "utf8");
  must(keybrSettingsScreen.includes("settings: liveObject(newSettings)") &&
    keybrLessonLoader.includes("loaded?.type === settings.get(lessonProps.type)") &&
    keybrTabList.includes("const selectedIndex = () => props.selectedIndex ?? 0"),
    "ux: Keybr settings must keep draft state, lesson loading, and selected tabs reactive");
  const keybrStyle = await readFile(join(ROOT, "src/games/keybr/src/style.css"), "utf8");
  must(keybrStyle.includes("--KeyboardKey-symbol--dead__color: var(--site-error") &&
    keybrStyle.includes("--Chart-speed__color: var(--site-fast-color") &&
    keybrStyle.includes("--syntax-number: var(--site-effort-color"),
    "ux: Keybr semantic colors must derive from the shared site theme");
  const keybrScreenStyle = await readFile(join(ROOT, "src/games/keybr/packages/keybr-pages-shared/lib/Screen.module.css"), "utf8");
  const keybrTabStyle = await readFile(join(ROOT, "src/games/keybr/packages/keybr-widget/lib/components/tablist/TabList.module.css"), "utf8");
  const keybrFieldListStyle = await readFile(join(ROOT, "src/games/keybr/packages/keybr-widget/lib/components/fieldlist/FieldList.module.css"), "utf8");
  must(keybrScreenStyle.includes("inline-size: min(70rem, 100%)") && keybrScreenStyle.includes("min-inline-size: 0") &&
    keybrTabStyle.includes("@media (max-width: 600px)") && keybrTabStyle.includes("min-inline-size: 0") &&
    keybrFieldListStyle.includes("@media (max-width: 600px)") && keybrFieldListStyle.includes("flex-wrap: wrap"),
    "ux: Keybr practice/settings/statistics and form rows must fit phone widths");
  must(chainLogo.includes("'0101'") && chainLogo.match(/'1110'/g)?.length === 2 && chainLogo.includes("const gap = 2"),
    "ux: Chain back mark must use the requested 4x4 bitmap and two-cell gap");
  must(chainLogo.includes("var(--site-bg") && chainLogo.includes("samey-themechange") &&
    chainEngine.includes("const playerColor") && chainEngine.includes("--range-fill-width") && chainEngine.includes("buildBoard();"),
    "ux: Chain canvases, range fills, and untouched-board resizing must stay theme/reactivity aware");

  const homeSource = await readFile(join(ROOT, "src/site/pages/Home.tsx"), "utf8");
  const toolsPageSource = await readFile(join(ROOT, "src/tools/Tools.tsx"), "utf8");
  const blogSource = await readFile(join(ROOT, "src/blogs/Blog.tsx"), "utf8");
  must(homeSource.includes("home-tool-matrix") && homeSource.includes("home-writing-split") &&
    !toolsPageSource.includes("home-tool-matrix") && !blogSource.includes("home-writing-split"),
    "ux: editorial tools and split writing index belong on Home, not the Tools/Writing pages");

  const toolsSource = await readFile(join(ROOT, "src/tools/tools.ts"), "utf8");
  const toolsStyle = await readFile(join(ROOT, "src/tools/style.css"), "utf8");
  must(toolsSource.includes("monaco.editor.create(root.querySelector('#diff-original')") && toolsSource.includes("monaco.editor.create(root.querySelector('#diff-modified')"),
    "ux: both Diff sides must remain ordinary editable editors");
  must(toolsStyle.includes('@media(max-width:700px){.diff-panes,.diff-tool[data-layout="split"] .diff-panes{grid-template-columns:1fr;grid-template-rows:1fr 1fr}') &&
    toolsStyle.includes('.markdown-tool[data-view="combined"]{grid-template-columns:1fr 1fr}') && toolsStyle.includes('grid-template-rows:1fr 1fr}.markdown-tool[data-view="combined"]'),
    "ux: narrow Diff and Markdown combined views must stack top-to-bottom");
  must(!toolsStyle.includes('.text-stat strong{display:none}') &&
    toolsStyle.includes('.text-stat:nth-child(1) b,.text-stat:nth-child(1) strong{color:var(--site-effort-color,var(--site-accent))}') &&
    toolsStyle.includes('.text-stat:nth-child(3) b,.text-stat:nth-child(3) strong{color:var(--site-error)}'),
    "ux: mobile text counts must remain visible with word/non-ASCII colors");
  must(toolsStyle.includes("var(--site-effort-color") && toolsStyle.includes("var(--site-fast-color") &&
    toolsSource.includes("const fast = style.getPropertyValue('--site-fast-color')"),
    "ux: Tools highlights and Diff colors must derive from the shared theme");
  must(toolsStyle.includes('.number-input-pane>input{box-sizing:border-box;width:100%') &&
    toolsStyle.includes('.number-options input{box-sizing:border-box;width:100%') &&
    toolsStyle.includes('.number-card input{box-sizing:border-box;min-width:0;width:100%'),
    "ux: Number Lab inputs must include their padding inside mobile width constraints");
  must(toolsStyle.includes('.tool-select-item{width:100%;padding:0 10px!important;text-align:left!important;justify-items:start}'),
    "ux: narrow tool selector entries must be left-aligned without excess inset");

  const sharedSite = await readFile(join(ROOT, "src/shared/site.ts"), "utf8");
  must(sharedSite.includes("destination.textContent = external ? '↗' : newPage ? '→' : ''") &&
    sharedSite.includes("window.open(targetUrl.href, '_blank', 'noopener,noreferrer')"),
    "ux: search must distinguish external destinations for click and keyboard activation");
  const sharedTheme = await readFile(join(ROOT, "src/shared/theme.ts"), "utf8");
  const appearanceConfig = await readFile(join(ROOT, "src/static/shared/appearance.json"), "utf8");
  must(appearanceConfig.includes('"warning":"#d4a72c"') && appearanceConfig.includes('"warning":"#facc15"') &&
    sharedTheme.includes('root.style.setProperty("--site-warning-color", theme.warning)') &&
    wordleBrand.includes("var(--site-warning-color") && wordleBrand.includes("var(--site-error") &&
    wordleStyle.includes(".wordle-state-r { background: color-mix(in srgb, var(--site-error") &&
    wordleStyle.includes(".wordle-state-y { background: color-mix(in srgb, var(--site-warning-color"),
    "ux: built-in themes and Wordle states must retain explicit red/yellow/green/blue semantics");
  must(sharedTheme.includes("setDragImage(dragPreview, Math.round(dragPreviewW / 2), Math.round(dragPreviewH / 2))") &&
    sharedTheme.includes("target.closest('[data-text-cursor-zone]')") && sharedTheme.includes("samey-cursor-link-fill") &&
    !sharedTheme.includes("selectionDragCandidate") && !sharedTheme.includes("startEmulatedDrag"),
    "ux: text/link dragging must stay native, center the custom drag image, and support wrapper-level text cursors");
  const sharedCss = await readFile(join(ROOT, "src/shared/styles/site.css"), "utf8");
  must(sharedCss.includes(".samey-context-menu{position:fixed;z-index:2147483646") &&
    sharedCss.includes(".samey-cursor-link-fill{position:fixed") && sharedCss.includes("z-index:2147483645") &&
    blogSource.includes("<main data-text-cursor-zone>") && homeSource.includes('home-writing-detail" data-text-cursor-zone'),
    "ux: prose cursor zones must cover Writing surfaces and context menus must layer above link inversion but below the cursor");
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
    "index.html", "work.html", "tools.html", "chain.html", "work", "tools", "chain",
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
    rm(join(ROOT, "src/games/keybr/dist"), { recursive: true, force: true }),
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
  log("solid -> docs/wordle.html");
}



async function buildKeybr() {
  await ensureDeps(ROOT);
  await run(ROOT, process.execPath, ["./node_modules/vite/bin/vite.js", "build", "--config", "src/games/keybr/vite.config.ts"]);
  const html = await walk(GENERATED_KEYBR, (_path, name) => name.endsWith(".html"));
  must(html.length === 1, `Keybr Vite build emitted ${html.length} HTML files`);
  let source = await readFile(html[0], "utf8");
  const shared = '<link rel="stylesheet" href="./site.css" data-samey-shared><script src="./shared-runtime.js"></script>';
  source = source.replace("</head>", `${shared}</head>`);
  await mkdir(DOCS, { recursive: true });
  await writeFile(join(DOCS, "keybr.html"), source);
  log("solid keybr -> docs/keybr.html");
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
  const source = `// Generated by build.ts. Do not edit.\nconst CACHE_PREFIX = 'samey-site-';\nconst CACHE = CACHE_PREFIX + '${version}';\nconst ROOT = new URL('./', self.registration.scope);\nconst CORE = ${JSON.stringify(files)};\n\nself.addEventListener('install', event => {\n  event.waitUntil(Promise.all([\n    caches.open(CACHE).then(cache => cache.addAll(CORE.map(path => new URL(path, ROOT)))),\n    self.skipWaiting(),\n  ]));\n});\n\nself.addEventListener('activate', event => {\n  event.waitUntil(Promise.all([\n    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))),\n    self.clients.claim(),\n  ]));\n});\n\nconst offlineNavigation = async request => {\n  const cached = await caches.match(request);\n  if (cached) return cached;\n  const url = new URL(request.url);\n  if (url.pathname.endsWith('/')) {\n    const directoryIndex = await caches.match(new URL('index.html', url));\n    if (directoryIndex) return directoryIndex;\n  } else if (!url.pathname.split('/').pop()?.includes('.')) {\n    const htmlPage = await caches.match(new URL(url.pathname + '.html', url.origin));\n    if (htmlPage) return htmlPage;\n    const directoryIndex = await caches.match(new URL(url.pathname + '/index.html', url.origin));\n    if (directoryIndex) return directoryIndex;\n  }\n  return caches.match(new URL('index.html', ROOT));\n};\n\nself.addEventListener('fetch', event => {\n  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;\n  if (event.request.mode === 'navigate') {\n    event.respondWith((async () => {\n      try {\n        const response = await fetch(event.request);\n        if (response.ok) {\n          (await caches.open(CACHE)).put(event.request, response.clone());\n          return response;\n        }\n        return (await offlineNavigation(event.request)) || response;\n      } catch { return offlineNavigation(event.request); }\n    })());\n    return;\n  }\n  const refresh = fetch(event.request).then(async response => {\n    if (response.ok) (await caches.open(CACHE)).put(event.request, response.clone());\n    return response;\n  });\n  event.respondWith(caches.match(event.request).then(cached => cached || refresh).catch(() => refresh));\n  event.waitUntil(refresh.catch(() => undefined));\n});\n`;
  await writeFile(join(DOCS, "sw.js"), source);
}

async function removeCompressionSidecars() {
  const sidecars = await walk(DOCS, (_path, name) => /\.html\.(?:gz|br)$/.test(name));
  await Promise.all(sidecars.map(path => unlink(path)));
  if (sidecars.length) log(`removed ${sidecars.length} obsolete HTML compression sidecars`);
}

async function main() {
  must(invalidTargets.length === 0, `unknown target: ${invalidTargets.join(", ")} (use solid, keybr, static, or all)`);
  await verifySourceArchitecture();
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
  await removeCompressionSidecars();
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
