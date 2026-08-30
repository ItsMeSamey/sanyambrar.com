import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdir, readFile, readdir, rename, rm, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
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

const dependencyInstalls = new Map<string, Promise<void>>();

async function ensureDepsUnlocked(dir: string) {
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

async function ensureDeps(dir: string) {
  const key = resolve(dir);
  const existing = dependencyInstalls.get(key);
  if (existing) return existing;

  const pending = ensureDepsUnlocked(key);
  dependencyInstalls.set(key, pending);
  try {
    await pending;
  } finally {
    if (dependencyInstalls.get(key) === pending) dependencyInstalls.delete(key);
  }
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
  must(existsSync(join(ROOT, "src/tools/Tools.tsx")) && existsSync(join(ROOT, "src/tools/ToolSurface.tsx")),
    "architecture: tools must use the shared ToolSurface");
  for (const file of ["TextTool.tsx", "EncodeTool.tsx", "DiffTool.tsx", "NumbersTool.tsx", "MarkdownTool.tsx"])
    must(!existsSync(join(ROOT, "src/tools", file)), `architecture: redundant tool wrapper remains: src/tools/${file}`);
  must(!existsSync(join(ROOT, "src/site/components/icons.tsx")), "architecture: one-use site icon wrapper should not return");
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
  must(transitions.includes("duration: 210") && !transitions.includes("clipPath") &&
    !transitions.includes("querySelectorAll<HTMLElement>('*')") && transitions.includes("querySelectorAll<HTMLCanvasElement>('canvas')"),
    "performance: page transitions must stay compositor-only and avoid walking every descendant during snapshot setup");
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
  const wordleBackButton = await readFile(join(ROOT, "src/games/wordle/WordleBackButton.tsx"), "utf8");
  const wordleDatePicker = await readFile(join(ROOT, "src/games/wordle/WordleDatePicker.tsx"), "utf8");
  const wordleWordList = await readFile(join(ROOT, "src/games/wordle/word-list.ts"), "utf8");
  const wordleHistory = await readFile(join(ROOT, "src/games/wordle/words.tsx"), "utf8");
  must(wordlePage.includes("<GameTopBarActions ariaLabel='Wordle'>") && wordlePage.includes("<StatsPageTrigger />") &&
    wordlePage.includes("nav={gameActions()}") && !wordlePage.includes("wordle-topbar-actions"),
    "ux: Wordle must expose Statistics through the shared game action rail");
  const wordleBrand = await readFile(join(ROOT, "src/shared/components/Brand.tsx"), "utf8");
  must(wordleStats.includes("<WordleBackButton") && wordleBackButton.includes('WordleMark text="<WORDLE"') &&
    !wordleStats.includes(">Wordle</BackLink>") && !wordleStats.includes("HomeBrand"),
    "ux: Wordle Statistics must have one shared Wordle-cell back control to the picker");
  must(wordleBackButton.includes('class="wordle-back-wordmark"') && !wordlePage.includes("MODES") &&
    !wordlePage.includes("result-board") && !wordleStyle.includes(".result-board"),
    "ux: Wordle subpages must render boxed <WORDLE cells and completion must not render a recap board");
  must(wordleBrand.includes("colors:readonly SemanticRole[]") && wordleBrand.includes("props.colors[index % props.colors.length]") &&
    wordleBrand.includes("--site-${name}-on-fg"),
    "architecture: Wordle text rendering must be centralized and use contrast-aware semantic colors");
  must(wordleStyle.includes("--wordle-key-neutral: color-mix(in srgb,var(--site-fg") &&
    wordleStyle.includes("var(--wordle-state-r-bg)") && wordleStyle.includes("var(--wordle-state-r-fg)") &&
    wordleStyle.includes("var(--wordle-state-y-bg)") && wordleStyle.includes("var(--wordle-state-g-bg)") &&
    wordleStyle.includes("var(--wordle-state-b-bg)") && wordleStyle.includes(".stats-page") &&
    wordleStyle.includes("var(--color-background)") && wordleStyle.includes(".wordle-key-pressed{filter:none") &&
    !wordleStyle.includes("filter:invert(1)"),
    "ux: Wordle keyboard, game states, and subpage surfaces must derive from contrast-safe site theme pairs");
  must(wordleStyle.includes(".stats-content { display: grid; gap: 16px; align-content: start; grid-auto-rows: max-content; }") &&
    wordleStyle.includes("color-mix(in srgb,var(--color-border) 12%,transparent)"),
    "ux: Wordle statistics rows must not stretch and game-grid contrast must stay subdued");
  must(wordlePage.includes("<WordleDatePicker") && !wordlePage.includes("type='date'") &&
    wordleDatePicker.includes("solid-ui.com/docs/components/date-picker") && wordleDatePicker.includes("data-completed") &&
    wordleHistory.includes("getCompletedDailyDates"),
    "ux: Wordle Daily selection must use the Solid UI-style calendar and mark completed dates");
  must(wordleWordList.includes("playableNextLetters") && wordlePage.includes("playableNextLetters(this.hard.wordLength, prefix, this.disabled)"),
    "correctness: Wordle fast invalidate suggestions must have an excluded-letter-free full continuation");
  must(wordleStyle.includes("radial-gradient(ellipse at 50% 45%") &&
    wordleStyle.includes(".wordle-key-suggested{position:relative;z-index:2;outline:2px solid"),
    "ux: Wordle surfaces must retain the subtle vignette and visible fast-invalidate outline");

  const chainPage = await readFile(join(ROOT, "src/games/chain/Chain.tsx"), "utf8");
  const chainEngine = await readFile(join(ROOT, "src/games/chain/chain.ts"), "utf8");
  const chainLogo = await readFile(join(ROOT, "src/shared/components/ChainLogo.tsx"), "utf8");
  must(chainPage.includes('<GameTopBarActions ariaLabel="Chain Reaction">') && chainPage.includes('label="Statistics"') &&
    chainPage.includes('ref={el => refs.statsView = el}') && chainEngine.includes("samey.chain.stats.v2") && !chainEngine.includes("getElementById"),
    "ux: Chain Reaction must expose persistent statistics through shared actions and direct refs");
  must(chainPage.includes('ref={el => refs.statsBackButton = el}') && chainLogo.includes("const BACK_ROWS"),
    "ux: Chain Statistics must use the Chain back mark");
  must(chainPage.includes('ref={el => refs.replayCanvas = el}') && chainPage.includes('ref={el => refs.replayPlay = el}') &&
    chainEngine.includes("moveHistory.push(encodeMove(owner, start))") && chainEngine.includes("buildReplayFrames") &&
    chainEngine.includes("LEGACY_STATS_KEY"),
    "ux: Chain statistics must persist player move locations and replay completed matches");
  must(chainEngine.includes("const PAGE_QUERY = 'p'") && chainEngine.includes("addEventListener('popstate', onPopState)") && chainEngine.includes("url.searchParams.set(PAGE_QUERY, page)"),
    "ux: Chain subpages must round-trip through query-string history");
  must(keybrViewSwitch.includes('searchParams.get("p")') && keybrViewSwitch.includes('history.pushState') && keybrViewSwitch.includes('addEventListener("popstate", onPopState)'),
    "ux: Keybr subpages must round-trip through query-string history");
  const keybrSettingsScreen = await readFile(join(ROOT, "src/games/keybr/packages/page-practice/lib/settings/SettingsScreen.tsx"), "utf8");
  const keybrLessonLoader = await readFile(join(ROOT, "src/games/keybr/packages/keybr-lesson-loader/lib/LessonLoader.tsx"), "utf8");
  const keybrReactiveSettings = await readFile(join(ROOT, "src/games/keybr/packages/keybr-settings/lib/reactive.ts"), "utf8");
  const keybrLessonSettings = await readFile(join(ROOT, "src/games/keybr/packages/page-practice/lib/settings/LessonSettings.tsx"), "utf8");
  const keybrWordListLesson = await readFile(join(ROOT, "src/games/keybr/packages/keybr-lesson/lib/wordlist.ts"), "utf8");
  const keybrBooksLesson = await readFile(join(ROOT, "src/games/keybr/packages/keybr-lesson/lib/books.ts"), "utf8");
  const keybrCustomTextLesson = await readFile(join(ROOT, "src/games/keybr/packages/keybr-lesson/lib/customtext.ts"), "utf8");
  must(!keybrSettingsScreen.includes("createReactiveSettings(snapshotSettings(settings))") &&
    keybrSettingsScreen.includes("<KeyboardProvider>") &&
    keybrLessonLoader.includes("loaded?.type === settings.get(lessonProps.type)") &&
    keybrLessonLoader.includes("<Show keyed when={currentLesson()}") &&
    keybrReactiveSettings.includes("const revisions = new Map") &&
    keybrReactiveSettings.includes("revision(prop.key)[0]()") &&
    keybrReactiveSettings.includes("Object.is(before[key], after[key])") &&
    keybrReactiveSettings.includes("const toJSON = () => untrack(current).toJSON()") &&
    !keybrReactiveSettings.includes("allRevision") &&
    keybrLessonSettings.includes("<SegmentedControl") &&
    keybrLessonSettings.includes("comfortable") &&
    keybrLessonSettings.includes("value={settings.get(lessonProps.type)}") &&
    keybrWordListLesson.includes("get wordList(): WordList") &&
    keybrBooksLesson.includes("get paragraphs(): readonly string[]") &&
    keybrBooksLesson.includes("get paragraphIndex(): number") &&
    keybrCustomTextLesson.includes("get wordList(): readonly string[]"),
    "ux: Keybr settings must persist immediately and lesson-derived previews must stay reactive");
  const keybrSolidReactCompat = await readFile(join(ROOT, "src/games/keybr/packages/keybr-solid-compat/react.tsx"), "utf8");
  const keybrLayoutEffectStart = keybrSolidReactCompat.indexOf("export function useLayoutEffect");
  const keybrLayoutEffectEnd = keybrSolidReactCompat.indexOf("\n}", keybrLayoutEffectStart) + 2;
  const keybrLayoutEffect = keybrSolidReactCompat.slice(keybrLayoutEffectStart, keybrLayoutEffectEnd);
  must(keybrLayoutEffectStart >= 0 && keybrLayoutEffect.includes("createEffect(() =>") && !keybrLayoutEffect.includes("createRenderEffect(() =>"),
    "ux: Keybr React layout effects must run after DOM refs are attached");
  const keybrStyle = await readFile(join(ROOT, "src/games/keybr/src/style.css"), "utf8");
  const keybrHtml = await readFile(join(ROOT, "src/games/keybr/index.html"), "utf8");
  must(keybrStyle.includes("--keybr-preferred-root-font-size") &&
    keybrStyle.includes("font-size: clamp(8px, calc(2vw - 1px), var(--keybr-preferred-root-font-size))") &&
    keybrHtml.includes("let widest = Math.max(innerWidth, screen.width || 0, screen.availWidth || 0)") &&
    keybrHtml.includes('"--keybr-preferred-root-font-size", `${preferredSize(widest)}px`') &&
    keybrStyle.includes("--keybr-chart-speed: var(--site-fast-fg") &&
    keybrStyle.includes("--pinky-zone-color: var(--site-fast-bg") &&
    keybrStyle.includes("--right-index-zone-color: var(--site-effort-bg") &&
    keybrStyle.includes("--syntax-number: var(--site-effort-fg") &&
    keybrStyle.includes("--Button__background-color: var(--primary-d1)"),
    "ux: Keybr must keep its desktop scale until the practice surface is actually narrow, while keeping colored foregrounds vivid and background variants muted");
  const keybrKeyStyles = await readFile(join(ROOT, "src/games/keybr/packages/keybr-lesson-ui/lib/styles.ts"), "utf8");
  const keybrProgressOverview = await readFile(join(ROOT, "src/games/keybr/packages/keybr-chart/lib/ProgressOverviewChart.tsx"), "utf8");
  const keybrSpeedHistogram = await readFile(join(ROOT, "src/games/keybr/packages/keybr-chart/lib/SpeedHistogram.tsx"), "utf8");
  const keybrChartDecoration = await readFile(join(ROOT, "src/games/keybr/packages/keybr-chart/lib/decoration.ts"), "utf8");
  must(keybrKeyStyles.includes('resolveColor("--slow-key-color"') && keybrKeyStyles.includes('resolveColor("--fast-key-color"') &&
    keybrProgressOverview.includes("confidenceForegroundColor") &&
    keybrSpeedHistogram.includes("Shapes.polyline(points)") && keybrSpeedHistogram.includes("styles.background, lineWidth: 4") &&
    keybrChartDecoration.includes("Shapes.stroke") && keybrChartDecoration.includes('lineCap: "round"'),
    "ux: Keybr progress charts must use foreground semantics and antialiased contrast-safe lines");
  const keybrExplainToggle = await readFile(join(ROOT, "src/games/keybr/packages/keybr-pages-shared/lib/ExplainToggle.tsx"), "utf8");
  const keybrExplainer = await readFile(join(ROOT, "src/games/keybr/packages/keybr-widget/lib/components/explainer/Explainer.tsx"), "utf8");
  must(keybrExplainToggle.includes("explainerState.explainersVisible") && keybrExplainer.includes("explainerState.explainersVisible") &&
    !keybrExplainToggle.includes("const { explainersVisible") && !keybrExplainer.includes("const { explainersVisible"),
    "ux: Keybr explanation visibility must remain reactive after toggling");
  const sharedThemeRuntime = await readFile(join(ROOT, "src/shared/theme.ts"), "utf8");
  must(sharedThemeRuntime.includes('dataset.siteKind === "keybr" ? "monospace" : "sans-serif"') &&
    sharedThemeRuntime.includes('data-open-advanced') && sharedThemeRuntime.includes('data-save-theme') &&
    sharedThemeRuntime.includes('data-menu-theme') && sharedThemeRuntime.includes('selectionBg') &&
    sharedThemeRuntime.includes('`--site-${role}-bg`'),
    "ux: appearance must default to monospace and expose saved advanced themes with separate foreground/background colors");
  const keybrCanvas = await readFile(join(ROOT, "src/games/keybr/packages/keybr-widget/lib/components/canvas/Canvas.tsx"), "utf8");
  const keybrElementSize = await readFile(join(ROOT, "src/games/keybr/packages/keybr-widget/lib/hooks/use-element-size.ts"), "utf8");
  must(keybrCanvas.includes("const currentSize = size()") && keybrCanvas.includes("context.setTransform") &&
    keybrCanvas.includes('"inline-size": "100%"') && keybrCanvas.includes('"block-size": "100%"') &&
    keybrCanvas.includes('addEventListener("samey-themechange", repaint)') && keybrCanvas.includes("themeRevision()") &&
    keybrElementSize.includes("return size;") && !keybrElementSize.includes("return size();"),
    "ux: Keybr canvas sizing and theme repainting must stay reactive so statistics charts update immediately");
  const keybrControls = await readFile(join(ROOT, "src/games/keybr/packages/page-practice/lib/practice/Controls.tsx"), "utf8");
  const keybrControlsStyle = await readFile(join(ROOT, "src/games/keybr/packages/page-practice/lib/practice/Controls.module.css"), "utf8");
  const keybrTopBar = await readFile(join(ROOT, "src/games/keybr/packages/page-practice/lib/KeybrTopBar.tsx"), "utf8");
  const keybrIconStyle = await readFile(join(ROOT, "src/games/keybr/packages/keybr-widget/lib/components/icon/Icon.module.css"), "utf8");
  const keybrCheckbox = await readFile(join(ROOT, "src/games/keybr/packages/keybr-widget/lib/components/checkbox/CheckBox.tsx"), "utf8");
  const keybrRange = await readFile(join(ROOT, "src/games/keybr/packages/keybr-widget/lib/components/range/Range.tsx"), "utf8");
  const keybrWidgetIndex = await readFile(join(ROOT, "src/games/keybr/packages/keybr-widget/lib/components/index.ts"), "utf8");
  const keybrLessonProps = await readFile(join(ROOT, "src/games/keybr/packages/keybr-lesson/lib/settings.ts"), "utf8");
  const keybrLessonLength = await readFile(join(ROOT, "src/games/keybr/packages/page-practice/lib/settings/lesson/LessonLengthProp.tsx"), "utf8");
  const keybrTypingSettings = await readFile(join(ROOT, "src/games/keybr/packages/keybr-textinput-ui/lib/TypingSettings.tsx"), "utf8");
  const keybrNameValue = await readFile(join(ROOT, "src/games/keybr/packages/keybr-widget/lib/components/text/NameValue.tsx"), "utf8");
  const keybrEventIconStyle = await readFile(join(ROOT, "src/games/keybr/packages/page-practice/lib/practice/state/event-icons.module.css"), "utf8");
  const keybrBookPreview = await readFile(join(ROOT, "src/games/keybr/packages/keybr-content/lib/books/BookPreview.tsx"), "utf8");
  const keybrLessonPreview = await readFile(join(ROOT, "src/games/keybr/packages/page-practice/lib/settings/lesson/LessonPreview.tsx"), "utf8");
  const keybrCustomTextSettings = await readFile(join(ROOT, "src/games/keybr/packages/page-practice/lib/settings/lesson/CustomTextLessonSettings.tsx"), "utf8");
  const keybrEffortLegend = await readFile(join(ROOT, "src/games/keybr/packages/keybr-lesson-ui/lib/EffortLegend.tsx"), "utf8");
  const keybrEffort = await readFile(join(ROOT, "src/games/keybr/packages/keybr-lesson-ui/lib/effort.ts"), "utf8");
  must(keybrEffortLegend.includes("effort.textShade(value)") && keybrEffort.includes("contrastTextRgb("),
    "ux: Keybr effort legend text must adapt to its shaded background");
  const sharedTopBar = await readFile(join(ROOT, "src/shared/components/TopBar.tsx"), "utf8");
  const sharedGameActions = sharedTopBar.slice(sharedTopBar.indexOf("export function GameTopBarActions"), sharedTopBar.indexOf("export function PrimaryNav"));
  must(!keybrTopBar.includes('label="Home"') && keybrTopBar.includes("<TopBar") && keybrTopBar.includes("<GameTopBarActions") &&
    keybrTopBar.indexOf('label="Statistics"') < keybrTopBar.indexOf('label="Settings"') &&
    keybrTopBar.includes('disabled={currentView() === "statistics"}') &&
    keybrTopBar.includes('disabled={currentView() === "settings"}') &&
    sharedTopBar.includes('disabled={props.disabled}') &&
    sharedGameActions.indexOf("<AppearanceButton/>") < sharedGameActions.indexOf("{props.children}") &&
    sharedGameActions.indexOf("{props.children}") < sharedGameActions.indexOf("<SearchButton/>") &&
    keybrTopBar.includes("<Show") && keybrTopBar.includes('fallback={<HomeBrand class="brand home-brand-link" />}') && keybrTopBar.includes("<KeybrMark") &&
    keybrControls.indexOf("<CircleHelp") < keybrControls.indexOf("<Maximize2") &&
    keybrControls.indexOf("<Maximize2") < keybrControls.indexOf("<Undo2") &&
    keybrControls.indexOf("<Undo2") < keybrControls.lastIndexOf("<Redo2") &&
    !keybrControls.includes("mdiHome") && !keybrControls.includes("AppearanceButton") &&
    keybrControlsStyle.includes("grid-template-columns: repeat(2, 28px)") &&
    keybrControlsStyle.includes("inset-inline-end: clamp(3.25rem, 7vw, 6rem)") &&
    keybrIconStyle.includes("fill: none") && keybrIconStyle.includes("stroke: currentColor") &&
    keybrCheckbox.includes('@kobalte/core/checkbox') && keybrEventIconStyle.includes("fill: none") &&
    keybrRange.includes("local.size ?? 16") &&
    !keybrWidgetIndex.includes("radiobox") && !keybrWidgetIndex.includes("tablist") && !keybrWidgetIndex.includes("Checkable") &&
    keybrLessonProps.includes('length: numberProp("lesson.length", 0, { min: 0, max: 1.25 })') &&
    keybrLessonLength.includes('min={0} max={125}') &&
    keybrTypingSettings.includes('label: "None"') && keybrTypingSettings.includes('label: "Error only"') &&
    keybrTypingSettings.includes('label: "Key only"') && keybrTypingSettings.includes('label: "All"') &&
    keybrNameValue.includes('typeof v === "string" || typeof v === "number"') &&
    !keybrNameValue.includes("isValidElement") &&
    !keybrSettingsScreen.includes("snapshotSettings(") &&
    !keybrBookPreview.match(/const\s*\{[^;]+\}\s*=\s*useMemo\(/s) &&
    !keybrLessonPreview.match(/const\s*\{[^;]+\}\s*=\s*useMemo\(/s) &&
    !keybrCustomTextSettings.match(/const\s*\{[^;]+\}\s*=\s*useMemo\(/s),
    "ux: Keybr topbar, side controls, segmented sound labels, checkboxes, preview nodes, and memo values must retain Solid-port fixes");
  const keybrScreenStyle = await readFile(join(ROOT, "src/games/keybr/packages/keybr-pages-shared/lib/Screen.module.css"), "utf8");
  const keybrFieldListStyle = await readFile(join(ROOT, "src/games/keybr/packages/keybr-widget/lib/components/fieldlist/FieldList.module.css"), "utf8");
  const keybrSizeStyle = await readFile(join(ROOT, "src/games/keybr/packages/keybr-widget/lib/styles/size.module.css"), "utf8");
  const keybrOptionStyle = await readFile(join(ROOT, "src/games/keybr/packages/keybr-widget/lib/components/optionlist/OptionListMenu.module.css"), "utf8");
  const sharedSettingsStyle = await readFile(join(ROOT, "src/shared/styles/game-settings.css"), "utf8");
  must(keybrScreenStyle.includes("inline-size: min(70rem, 100%)") && keybrScreenStyle.includes("min-inline-size: 0") &&
    keybrFieldListStyle.includes("overflow-wrap: anywhere") && keybrFieldListStyle.includes("flex-wrap: wrap") && keybrFieldListStyle.includes(":has(> :global(.keybr-segmented))") &&
    keybrSizeStyle.includes("@media (max-width: 720px)") && keybrSizeStyle.includes("max-inline-size: 100%") &&
    keybrOptionStyle.includes("white-space: normal") && keybrOptionStyle.includes("overflow-wrap: anywhere") &&
    sharedSettingsStyle.includes(".keybr-segmented") && sharedSettingsStyle.includes("flex-wrap: wrap"),
    "ux: Keybr practice/settings/statistics, segmented choices, menus, and form rows must fit phone widths without overflow");
  must(chainLogo.includes("'0101'") && chainLogo.match(/'1110'/g)?.length === 2 && chainLogo.includes("const gap = 2"),
    "ux: Chain back mark must use the requested 4x4 bitmap and two-cell gap");
  must(chainLogo.includes("var(--site-bg") && chainLogo.includes("samey-themechange") &&
    chainEngine.includes("function playerColor") && chainEngine.includes("--range-fill-width") && chainEngine.includes("buildBoard();"),
    "ux: Chain canvases, range fills, and untouched-board resizing must stay theme/reactivity aware");
  must(chainEngine.includes("mixColor(base, 'rgb(255 255 255)', .38)") &&
    chainEngine.includes("mixColor(base, 'rgb(0 0 0)', .30)") &&
    chainEngine.includes("g.shadowColor = 'rgba(0,0,0,.26)'") &&
    !chainEngine.includes("resolvedColor('color-mix(in srgb,var(--site-fg) 18%,transparent)'"),
    "ux: Chain orb lighting must not invert its highlight/shadow in dark themes");

  const homeSource = await readFile(join(ROOT, "src/site/pages/Home.tsx"), "utf8");
  const reverbDemoSource = await readFile(join(ROOT, "src/site/components/ReverbDemo.tsx"), "utf8");
  const cnnDemoSource = await readFile(join(ROOT, "src/site/components/CnnDemo.tsx"), "utf8");
  const cnnWorkerSource = await readFile(join(STATIC, "cnn-worker.js"), "utf8");
  const reverbRuntimeSource = await readFile(join(ROOT, "src/site/demos/reverb-runtime.js"), "utf8");
  const reverbDemoHtml = await readFile(join(ROOT, "src/site/demos/reverb-home.html"), "utf8");
  must(reverbDemoSource.includes('class="reverb-demo-host"') && reverbDemoSource.includes("attachShadow({ mode: 'open' })") &&
    reverbDemoSource.includes("runReverbDemoRuntime(") && !reverbDemoSource.includes("new Function(") && !reverbDemoSource.includes("replaceAll(") && !reverbDemoSource.includes("CSS.escape") &&
    reverbRuntimeSource.includes("export function runReverbDemoRuntime") && reverbRuntimeSource.includes("function makeBlobShader(canvas)") && reverbRuntimeSource.includes("using 2D fallback") && reverbRuntimeSource.includes("canvas.cloneNode(false)") && reverbRuntimeSource.includes("return makeFallbackBlob(canvas)") && !reverbDemoHtml.includes("<script>") &&
    !reverbDemoSource.includes("<iframe") && !reverbDemoSource.includes("srcdoc=") && !reverbDemoSource.includes("sandbox="),
    "ux: Reverb UI demo must be an in-page compiled element, never eval/iframe/nested document");
  const homeStyle = await readFile(join(ROOT, "src/site/styles/home.css"), "utf8");
  const appSource = await readFile(join(ROOT, "src/site/App.tsx"), "utf8");
  const sharedSiteStyle = await readFile(join(ROOT, "src/shared/styles/site.css"), "utf8");
  const keybrIndicators = await readFile(join(ROOT, "src/games/keybr/packages/keybr-lesson-ui/lib/indicators.tsx"), "utf8");
  const keybrIndicatorStyle = await readFile(join(ROOT, "src/games/keybr/packages/keybr-lesson-ui/lib/indicators.module.css"), "utf8");
  must(homeStyle.includes(".reverb-demo-frame-shell{height:820px;min-height:820px") && reverbDemoHtml.includes(".phone{width:min(412px,calc(100% - 36px));height:min(820px,calc(100% - 36px));min-height:0") &&
    reverbDemoHtml.includes(".stage{width:100%;height:100%;min-height:0") && reverbDemoHtml.includes(".stage{padding:0 12px;background:var(--surface)}") && !reverbDemoHtml.includes("@media(max-height:"),
    "ux: Reverb mobile demo must size against its host, keep side margins, and avoid viewport-height compression");
  must(reverbDemoHtml.includes("touch-action:pan-y") && reverbDemoHtml.includes("user-select:none") &&
    reverbRuntimeSource.includes("if(clientY<blobRect.top)return 'settings'") && reverbRuntimeSource.includes("if(clientY>blobRect.bottom)return 'library'") &&
    reverbRuntimeSource.includes("Only the reduced gesture regions suppress page scrolling"),
    "ux: Reverb page scrolling must remain available through the blob while source gestures are limited to regions above/below it");
  must(reverbDemoSource.includes('class="reverb-demo-fullscreen-button"') && !reverbDemoHtml.includes('demoFullscreen') && reverbDemoSource.includes("FULLSCREEN_STATE_KEY") &&
    reverbDemoSource.includes("history.pushState") && reverbDemoSource.includes("history.back()") && reverbDemoSource.includes("window.addEventListener('popstate'") &&
    reverbDemoSource.includes("frame.animate([") && reverbDemoSource.includes("installFullscreen(frame, fullscreenButton)") && homeStyle.includes(".reverb-demo-frame.is-fullscreen{position:fixed"),
    "ux: Reverb demo fullscreen must animate and participate in browser back/forward history");
  must(reverbRuntimeSource.includes("function captureSettingsSnapshot()") && reverbRuntimeSource.includes("captureSettingsSnapshot(); setDirty(false)") &&
    reverbRuntimeSource.includes("settingsInitial.get('oneLimitSeconds')") && reverbRuntimeSource.includes("settingsInitial.get('retentionMode')"),
    "ux: Reverb Settings undo must restore the last applied snapshot, not page-load defaults");
  must(cnnDemoSource.includes("const INPUT_SIZE = 28") && cnnDemoSource.includes("const DRAW_SIZE = 280") &&
    cnnDemoSource.includes("const OUTPUTS = ['0','1','2','3','4','5','6','7','8','9','?']") &&
    cnnDemoSource.includes("new Uint8Array(INPUT_SIZE * INPUT_SIZE)") && cnnDemoSource.includes("rgba[i * 4 + 3]") &&
    cnnDemoSource.includes("document.createElement('canvas')") && !cnnDemoSource.includes('class="cnn-sample-canvas"') &&
    cnnDemoSource.includes("new Worker('/cnn-worker.js')") && cnnDemoSource.includes("inferenceBusy") && cnnDemoSource.includes("queuedInference") &&
    cnnDemoSource.includes("worker.postMessage") && cnnDemoSource.includes("pending.input.buffer as ArrayBuffer") && cnnDemoSource.includes("message.id === generation") &&
    !cnnDemoSource.includes("WebAssembly.instantiate") && !cnnDemoSource.includes("wasm.predict()") &&
    !cnnDemoSource.includes("__sameyCnnInfer") && !cnnDemoSource.includes("CnnInference") &&
    cnnWorkerSource.includes("WebAssembly.instantiateStreaming") && cnnWorkerSource.includes("fetch('/cnn.wasm')") &&
    cnnWorkerSource.includes("wasm.predict()") && cnnWorkerSource.includes("wasm.image_ptr()") && cnnWorkerSource.includes("wasm.probabilities_ptr()") &&
    cnnWorkerSource.includes("exports.class_count()") && cnnWorkerSource.includes("exports.unknown_class()") &&
    existsSync(join(STATIC, "cnn.wasm")) && existsSync(join(STATIC, "cnn-worker.js")) &&
    cnnDemoSource.includes("ctx.globalAlpha = inkLevel()") && cnnDemoSource.includes('class="game-settings-slider cnn-ink-control"') &&
    cnnDemoSource.includes('class="game-range-shell"') && cnnDemoSource.includes('class="game-settings-action cnn-clear"') &&
    cnnDemoSource.includes("samey-themechange") && cnnDemoSource.includes('class="cnn-pad"') && cnnDemoSource.includes('class="cnn-probabilities"') &&
    !cnnDemoSource.includes("0–9, symbols, greys, noise") && !cnnDemoSource.includes("Sketch a digit, symbol, or noise") &&
    homeStyle.includes(".site-standard:has(.cnn-demo-section)") && homeStyle.includes(".site-standard:has(.reverb-demo-section)") &&
    homeStyle.includes(".cnn-demo-shell") && homeStyle.includes("touch-action:none") && !homeStyle.includes(".cnn-ink-range") &&
    !homeStyle.includes(".cnn-sample-canvas") && !homeStyle.includes(".cnn-pad-empty") && homeStyle.includes("var(--site-accent)"),
    "ux: CNN demo must keep drawing responsive with worker-backed WASM inference, one visible input, and shared themed controls");
  const keybrMobileRules = keybrIndicatorStyle.indexOf("@media (max-width: 700px)");
  must(keybrIndicators.includes("styles.keySetRow") && keybrIndicators.includes("styles.keySetValue") && keybrIndicatorStyle.includes(".keySetValue") &&
    keybrMobileRules >= 0 && !keybrIndicatorStyle.slice(0, keybrMobileRules).includes("flex-wrap: nowrap") &&
    keybrIndicatorStyle.slice(keybrMobileRules).includes("flex-wrap: nowrap") && keybrIndicatorStyle.slice(keybrMobileRules).includes("overflow-x: auto"),
    "ux: Keybr all-keys indicator must nowrap only on narrow screens and retain desktop wrapping");
  must(appSource.includes("formatThrownError") && appSource.includes("site-fatal-error-stack") && appSource.includes("<TopBar />") &&
    appSource.includes("Go back to home") && appSource.includes("location.reload()") && appSource.includes("retryRenderedRoute") &&
    sharedSiteStyle.includes(".site-fatal-error-stack") && sharedSiteStyle.includes(".site-fatal-topbar-fallback"),
    "ux: fatal route errors must keep navigation, expose full stacks, truly reload, and reset on navigation");
  const siteData = await readFile(join(ROOT, "src/site/data.ts"), "utf8");
  const entriesSource = await readFile(join(ROOT, "src/site/components/Entries.tsx"), "utf8");
  const workSource = await readFile(join(ROOT, "src/site/pages/Work.tsx"), "utf8");
  must((siteData.match(/demo:true/g) || []).length === 2 &&
    siteData.includes("title:'Reverb'") && siteData.includes("title:'CNN'") &&
    siteData.includes("tags:['python / zig','ml','mnist']") && siteData.includes("facts:['Python / Zig','99.43% MNIST','WASM inference']") &&
    !siteData.includes("export const moreProjects") &&
    !entriesSource.includes('demo-badge') && !entriesSource.includes('project-meta') &&
    homeSource.includes('title="Projects and demos"') && workSource.includes('title="Projects and demos"') &&
    !homeSource.includes('Projects with demos') && !workSource.includes('Projects with demos') && !workSource.includes('moreProjects'),
    "ux: portfolio project lists must show only the two interactive projects under the concise Projects and demos heading");
  const siteCatalog = await readFile(join(ROOT, "src/shared/catalog.ts"), "utf8");
  const toolsPageSource = await readFile(join(ROOT, "src/tools/Tools.tsx"), "utf8");
  const blogSource = await readFile(join(ROOT, "src/blogs/Blog.tsx"), "utf8");
  must(homeSource.includes("home-tool-matrix") && homeSource.includes("home-writing-split") &&
    !toolsPageSource.includes("home-tool-matrix") && !blogSource.includes("home-writing-split"),
    "ux: editorial tools and split writing index belong on Home, not the Tools/Writing pages");
  must(homeSource.includes('title="Projects and demos" href="/work/"') && homeSource.includes('title="Writing" href="/blog/"') &&
    !sharedTopBar.includes("showWork") && !sharedTopBar.includes("SITE_NAV") &&
    siteData.includes("Chain reaction clone with local AI.") && siteCatalog.includes("Word count and non-ASCII character detection.") &&
    homeStyle.includes(".site-standard .intro{display:flex;justify-content:space-between;align-items:center;gap:18px;min-height:72px"),
    "ux: Projects/Writing must be Home sections, card copy must stay concise, and the intro must stay compact");

  const toolsSource = await readFile(join(ROOT, "src/tools/tools.ts"), "utf8");
  const toolsStyle = await readFile(join(ROOT, "src/tools/style.css"), "utf8");
  const rootPackage = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
  const siteViteConfig = await readFile(join(ROOT, "vite.site.config.ts"), "utf8");
  must(rootPackage.dependencies?.["monaco-editor"] === "0.56.0" && !existsSync(join(ROOT, "patches")) &&
    rootPackage.devDependencies?.["patch-package"] === undefined && rootPackage.scripts?.postinstall === undefined &&
    !siteViteConfig.includes("samey-monaco-bounded-diff") && !siteViteConfig.includes("monaco-default-lines-diff-computer") &&
    !toolsSource.includes("import DiffWorker from './diff-worker.ts?worker'") && toolsSource.includes('monaco.editor.createDiffEditor(') &&
    toolsSource.includes('originalEditable:true') && toolsSource.includes('renderSideBySide:true') &&
    toolsSource.includes('enableSplitViewResizing:true') && toolsSource.includes('useInlineViewWhenSpaceIsLimited:false') &&
    toolsSource.includes("diffAlgorithm:'advanced'") && toolsSource.includes('maxComputationTime:75') &&
    toolsSource.includes("const fastBg = style.getPropertyValue('--site-fast-bg').trim()") && toolsSource.includes("const errorBg = style.getPropertyValue('--site-error-bg').trim()") &&
    toolsSource.includes("'diffEditor.insertedTextBackground': fastBg") && toolsSource.includes("'diffEditor.removedTextBackground': errorBg") &&
    toolsSource.includes("'diffEditor.insertedLineBackground': fastLineBg") && toolsSource.includes("'diffEditor.removedLineBackground': errorLineBg") &&
    toolsSource.includes('const scheduleSave = side =>') && toolsSource.includes('saveTimer = setTimeout(flushSave,400)') &&
    toolsSource.includes("addEventListener('pagehide',saveOnPageHide)") && !toolsSource.includes("set('left',value); set('text',value)") &&
    !toolsSource.includes("const save = () => { set('left'"),
    "ux: Diff must use one editable Monaco DiffEditor, native advanced diffing, and deferred persistence");
  must(toolsStyle.includes('/* One Monaco DiffEditor owns alignment, padding view-zones, and split resizing. */') &&
    toolsStyle.includes('.diff-monaco .monaco-diff-editor') && !toolsStyle.includes('.diff-panes') && !toolsStyle.includes('.diff-combined-table') &&
    toolsSource.includes("wordWrap:'off'") && !toolsSource.includes('const renderCombined = () =>') &&
    toolsStyle.includes('.markdown-tool[data-view="combined"]{grid-template-columns:1fr 1fr}') && toolsStyle.includes('grid-template-rows:1fr 1fr}.markdown-tool[data-view="combined"]'),
    "ux: Diff must be a single Monaco DiffEditor with native aligned view zones, while narrow Markdown remains stacked");
  must(!toolsStyle.includes('.text-stat strong{display:none}') &&
    toolsStyle.includes('.text-stat strong{font-size:12px;line-height:1;font-weight:800') &&
    toolsStyle.includes('.text-stat:nth-child(1) b,.text-stat:nth-child(1) strong{color:var(--site-effort-color,var(--site-accent))}') &&
    toolsStyle.includes('.text-stat:nth-child(3) b,.text-stat:nth-child(3) strong{color:var(--site-error)}'),
    "ux: text counts must remain legible and retain word/non-ASCII colors");
  must(toolsStyle.includes("var(--site-effort-color") &&
    toolsSource.includes("const fast = style.getPropertyValue('--site-fast-color')") && toolsSource.includes("const effort = style.getPropertyValue('--site-effort-color')"),
    "ux: Tools highlights and Diff colors must derive from the shared theme");
  must(toolsStyle.includes("width:var(--kb-popper-anchor-width)") && toolsStyle.includes("box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) 16px") &&
    toolsStyle.includes(".tools-page>.site-topbar{--site-topbar-height:72px;flex-basis:72px;height:72px}") && toolsStyle.includes(".tool-switcher>[role=group]{width:100%;min-width:0}") && toolsStyle.includes("overflow-x:auto"),
    "ux: mobile tool selection must match its popup width and stay separate from tool-specific controls");
  must(chainEngine.includes("MATCHES_KEY = 'samey.chain.matches.v1'") && chainEngine.includes("status = raw.s === 'completed' || raw.s === 'abandoned'") &&
    chainEngine.includes("bot:{id:'random',name:'Random Bot',version:1") && chainEngine.includes("function resumeReplayPoint()") &&
    chainEngine.includes("function drawBoardScene(") && chainEngine.includes("async function animateReplayMove("),
    "ux: Chain history must retain active/abandoned matches, bot/color metadata, exact renderer replays, and resume-from-point");
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
  must(sharedTheme.includes('const virtualScrollerOptOut =') && sharedTheme.includes('.monaco-host, .monaco-editor, .monaco-diff-editor') &&
    sharedTheme.includes('if (scanRaf || !pending.size) return;'),
    "performance: global virtual-scrollbar discovery must ignore Monaco-owned editor mutation trees");
  must(sharedTheme.includes('if (!document.documentElement.hasAttribute("data-solid-spa")) markInitialPageStyles();') &&
    !sharedTheme.includes('documentNavigationMounted = true;\n    markInitialPageStyles();'),
    "bugfix: page swaps must not reclassify runtime-loaded Monaco CSS as disposable page CSS");
  const appearanceConfig = await readFile(join(ROOT, "src/static/shared/appearance.json"), "utf8");
  must(appearanceConfig.includes('"warning":"#d4a72c"') && appearanceConfig.includes('"warning":"#facc15"') &&
    sharedTheme.includes('root.style.setProperty("--site-warning-color", theme.warningFg)') &&
    wordleBrand.includes("['fast', 'warning', 'error', 'fast', 'effort', 'warning']") &&
    sharedTheme.includes("const stateErrorBg = mix(theme.background, theme.errorFg") &&
    sharedTheme.includes("const stateWarningBg = mix(theme.background, theme.warningFg") &&
    sharedTheme.includes("const stateFastBg = mix(theme.background, theme.fastFg") &&
    sharedTheme.includes("const stateEffortBg = mix(theme.background, theme.effortFg") &&
    wordleStyle.includes(".wordle-state-r { background: var(--wordle-state-r-bg)") &&
    wordleStyle.includes(".wordle-state-y { background: var(--wordle-state-y-bg)"),
    "ux: built-in themes and Wordle states must retain explicit red/yellow/green/blue semantics");
  must(sharedTheme.includes("setDragImage(dragPreview, Math.round(dragPreviewW / 2), Math.round(dragPreviewH / 2))") &&
    sharedTheme.includes("target.closest('[data-text-cursor-zone]')") && sharedTheme.includes("samey-cursor-link-fill") &&
    !sharedTheme.includes("selectionDragCandidate") && !sharedTheme.includes("startEmulatedDrag"),
    "ux: text/link dragging must stay native, center the custom drag image, and support wrapper-level text cursors");
  const keybrPracticeScreen = await readFile(join(ROOT, "src/games/keybr/packages/page-practice/lib/practice/PracticeScreen.tsx"), "utf8");
  const blogArticle = await readFile(join(ROOT, "src/blogs/btop-mutex.html"), "utf8");
  must(blogArticle.includes('data-static-article data-site-kind="blog-post"'),
    "ux: static blog articles must identify themselves explicitly for cursor idle-hide policy");
  must(sharedTheme.includes("const cursorIdleMs = 2200") &&
    sharedTheme.includes('root.dataset.siteKind === "keybr"') &&
    sharedTheme.includes('root.dataset.siteKind === "wordle"') &&
    sharedTheme.includes('root.dataset.siteKind === "blog-post"') &&
    sharedTheme.includes('if (!cursorIdleHidingEnabled()) { clearCursorIdle(); return; }') &&
    sharedTheme.includes('addEventListener("samey-pageload", syncCursorIdlePolicy)') &&
    sharedTheme.includes('addEventListener("samey-solid-routechange", syncCursorIdlePolicy)') &&
    sharedTheme.includes('if (!hasPointerPosition || nativeDragging || cursor.hasAttribute("data-loading")) return;') &&
    sharedTheme.includes('const hasRawPointer = "onpointerrawupdate" in window') &&
    sharedTheme.includes('document.addEventListener("pointerrawupdate", moveCursorOnly') &&
    sharedTheme.includes("deadline is enough; one timer follows it") &&
    sharedTheme.includes("Stay hidden after the native/system cursor releases control") &&
    sharedTheme.includes("scale3d(${width / fillDot},${height / fillDot},1)") &&
    !sharedTheme.includes("if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) { place(event)"),
    "ux: the virtual cursor must only idle-hide on Keybr, Wordle, and static blog articles while keeping the low-latency raw-pointer/compositor path");
  const keybrCaret = await readFile(join(ROOT, "src/games/keybr/packages/keybr-textinput-ui/lib/Cursor.tsx"), "utf8");
  const settingsMotionCss = await readFile(join(ROOT, "src/shared/styles/game-settings.css"), "utf8");
  must(keybrCaret.includes('duration: 48') && keybrCaret.includes('transform: `translate3d(${fromLeft - left}px,${fromTop - top}px,0)`') &&
    !keybrCaret.includes('{ left: `${fromLeft}px`, top: `${fromTop}px` }') &&
    !settingsMotionCss.includes('transition: left 100ms') && !settingsMotionCss.includes('transition: width 100ms'),
    "performance: typing caret and sliders must not add positional interpolation latency on the main thread");
  must(keybrPracticeScreen.includes("const seedResults = untrack(() => lesson.filter(results))") &&
    !keybrPracticeScreen.includes("void results.length"),
    "ux: completing a Keybr lesson must append progress without rebuilding the whole practice screen");
  const siteChrome = await readFile(join(ROOT, "src/site/components/SiteChrome.tsx"), "utf8");
  const projectPage = await readFile(join(ROOT, "src/site/pages/Project.tsx"), "utf8");
  const reverbDemo = await readFile(join(ROOT, "src/site/components/ReverbDemo.tsx"), "utf8");
  const cnnDemo = await readFile(join(ROOT, "src/site/components/CnnDemo.tsx"), "utf8");
  must(projectPage.includes("props.detail.demo === 'cnn-draw'") && projectPage.includes("import('../components/CnnDemo.tsx')") &&
    siteData.includes("demo:'cnn-draw'") && cnnDemo.includes("cnn-settings-pane") && !cnnDemo.includes("Browser inference") && !cnnDemo.includes("WASM LIVE") && !cnnDemo.includes("11-way softmax") && !cnnDemo.includes("MODEL INPUT") && !cnnDemo.includes("0–9, symbols, greys, noise") && !cnnDemo.includes("Sketch a digit, symbol, or noise"),
    "ux: CNN project detail must keep its live-drawing demo mounted on the project page");
  must(projectPage.includes("props.detail.demo === 'reverb-ui'") && reverbDemo.includes("reverb-home.html' with { type: 'text' }") &&
    reverbDemo.includes("attachShadow({ mode: 'open' })") && reverbDemo.includes('class="reverb-demo-host"') &&
    reverbDemo.includes("querySelector: selectors => shadow.querySelector(selectors)") &&
    reverbDemoHtml.includes('<title>Reverb</title>') && reverbDemoHtml.includes('@media(pointer:fine){*{cursor:none!important}}') &&
    reverbRuntimeSource.includes('function appendCapture(seconds)') && reverbRuntimeSource.includes('const overflow=seconds-toOne') &&
    reverbRuntimeSource.includes('loopSeconds=Math.min(loopLimitSeconds,loopSeconds+overflow)') &&
    reverbDemoHtml.includes('class="gesture-hint left"') && reverbDemoHtml.includes('class="gesture-hint right"') &&
    reverbDemoHtml.includes('class="about-sheet"') && reverbDemoHtml.includes('https://github.com/SmallThingz/reverb') &&
    !reverbDemo.includes("<iframe") && !reverbDemo.includes("srcdoc=") && !reverbDemo.includes("sandbox=") && !reverbDemo.includes('src="/'),
    "ux: Reverb demo must remain inline, hide the native cursor, model bounded buffers, show gesture hints, and keep its faithful About sheet");
  const portfolioPages = await Promise.all([
    "src/site/pages/Home.tsx",
    "src/site/pages/Work.tsx",
    "src/site/pages/Project.tsx",
    "src/blogs/Blog.tsx",
    "src/tools/Tools.tsx",
  ].map(path => readFile(join(ROOT, path), "utf8")));
  must(siteChrome.includes("Site's source ↗") && siteChrome.includes("https://github.com/ItsMeSamey/itsmesamey.github.io") &&
    !siteChrome.includes('site-contact-footer') && !siteChrome.includes('function SiteFooter') &&
    portfolioPages.every(source => !source.includes("<SiteFooter") && !source.includes("SiteFooter")) && !homeStyle.includes('site-contact-footer'),
    "ux: the site-source link must remain available without a bottom contact footer on any portfolio page");
  const phoneticModel = await readFile(join(ROOT, "src/games/keybr/packages/keybr-phonetic-model/lib/phoneticmodel.ts"), "utf8");
  must(phoneticModel.includes("this.map.get(indexedCodePoint)!.push(prefix)") && !phoneticModel.includes("this.map.get(codePoint)!.push(prefix)"),
    "bugfix: Keybr phonetic prefixes must be indexed under every letter they contain");
  const sharedCss = await readFile(join(ROOT, "src/shared/styles/site.css"), "utf8");
  must(sharedCss.includes(".samey-theme-panel{position:fixed;left:8px;top:calc(var(--site-topbar-height) + 4px);z-index:var(--samey-z-theme);width:max-content;max-width:calc(100vw - 16px);min-width:0") &&
    !sharedCss.includes(".samey-theme-panel{position:fixed;left:8px;top:calc(var(--site-topbar-height) + 4px);z-index:var(--samey-z-theme);min-width:230px"),
    "ux: compact appearance menu width must follow its entries instead of a fixed minimum");
  must(sharedTheme.includes('globalThis.SameyLoadingBegin = () =>') && sharedTheme.includes('mountLoadingBar()') &&
    sharedTheme.includes('Math.max(0, time - loadingStarted)') &&
    sharedTheme.includes('"--KeyboardKey-pointer__color": theme.text') && sharedCss.includes('.samey-loading-top{') && sharedCss.includes('html[data-site-loading] .samey-loading-top'),
    "ux: loading must use the shared top strip and Keybr keyboard pointers must follow the foreground theme");
  const popoverSource = await readFile(join(ROOT, "src/ui-kit/registry/ui/popover.tsx"), "utf8");
  const dialogSource = await readFile(join(ROOT, "src/ui-kit/registry/ui/dialog.tsx"), "utf8");
  const tooltipSource = await readFile(join(ROOT, "src/ui-kit/registry/ui/tooltip.tsx"), "utf8");
  must(sharedCss.includes("--samey-z-link-fill:2147483000") && sharedCss.includes("--samey-z-overlay:2147483644") &&
    sharedCss.includes("[data-samey-overlay]{z-index:var(--samey-z-overlay)!important}") &&
    sharedTheme.includes('[data-samey-overlay-backdrop]') && sharedTheme.includes('refreshFillOcclusionRects') &&
    sharedTheme.includes('zIndexOf(overlay) > fillZ') && sharedTheme.includes('const subtractRect = (rect, hole) =>') &&
    sharedTheme.includes('samey-cursor-link-fill-slice') &&
    !sharedTheme.includes('linkBlockedByOverlay') && sharedTheme.includes('const source = lightBackdrop ? "#ccc" : "#fff"') &&
    popoverSource.includes("data-samey-overlay=''") && dialogSource.includes("data-samey-overlay=''") && tooltipSource.includes("data-samey-overlay=''") &&
    !sharedTheme.includes('querySelector(".samey-cursor-link-fill")?.setAttribute("hidden"') &&
    blogSource.includes("<main data-text-cursor-zone>") && homeSource.includes('home-writing-detail" data-text-cursor-zone'),
    "ux: prose cursor zones must work with overlay-aware link inversion and a discontinuous cursor blend source");
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
    "blog", "projects", "site-app.js", "site-chunks", "assets", "cnn.wasm", "cnn-worker.js",
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
  const shared = '<link rel="icon" href="./favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="./site.css" data-samey-shared><script src="./shared-runtime.js"></script>';
  source = source.replace("</head>", `${shared}</head>`);
  await mkdir(DOCS, { recursive: true });
  await writeFile(join(DOCS, "keybr.html"), source);
  log("solid keybr -> docs/keybr.html");
}

async function deployAssets() {
  return (await walk(DOCS, (_path, name) => /\.(?:html|css|js|wasm)$/.test(name) && name !== "sw.js"))
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
  // Bootstrap dependencies once before launching build stages in parallel.
  // ensureDeps is also single-flight so future concurrent callers cannot race
  // multiple Bun installers against the same node_modules tree.
  await ensureDeps(ROOT);
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
