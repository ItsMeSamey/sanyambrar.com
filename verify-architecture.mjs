import { existsSync, readFileSync } from 'node:fs';
import { deployAssets } from './scripts/site-files.mjs';

const must = (ok, message) => { if (!ok) throw new Error(message); };
for (const lock of ['keybr/bun.lock', 'wordle/bun.lock']) must(existsSync(lock), `missing frozen dependency lock: ${lock}`);
const theme = readFileSync('theme.js', 'utf8');
const provider = readFileSync('keybr/packages/keybr-themes/lib/themes/ThemeProvider.tsx', 'utf8');
const sw = readFileSync('sw.js', 'utf8');
const appearance = JSON.parse(readFileSync('shared/appearance.json', 'utf8'));
const generatedAppearance = readFileSync('appearance.generated.js', 'utf8');
const generatedLess = readFileSync('keybr/packages/keybr-themes/lib/themes/site-presets.generated.less', 'utf8');

must(theme.includes('Object.defineProperty(globalThis, "SameyAppearance"'), 'shared appearance API missing');
must(theme.includes('SameyAppearanceConfig'), 'shared runtime must consume generated appearance config');
must(generatedAppearance.includes(JSON.stringify(appearance)), 'generated appearance JS drift');
for (const [id, color] of Object.entries(appearance.colors)) for (const key of ['background','text','accent','error','slow','fast','effort']) must(generatedLess.includes(`@samey-${id}-${key}: ${color[key]};`), `generated Keybr palette drift: ${id}.${key}`);
must(!theme.includes('Storage.prototype.setItem ='), 'appearance runtime must not monkeypatch Storage');
must(provider.includes('globalThis.SameyAppearance'), 'Keybr must consume shared appearance API');
must(!provider.includes('localStorage'), 'Keybr must not duplicate appearance persistence');
must(!provider.includes('keybr.theme') && !provider.includes('samey.font'), 'appearance storage keys leaked into Keybr');
must(!provider.includes('mix(') && !provider.includes('style.setProperty') && !provider.includes('localStorage'), 'Keybr must not duplicate shared appearance derivation');
must(!readFileSync('keybr/packages/keybr-themes/lib/themes/index.ts', 'utf8').includes('./themes.ts'), 'dead Keybr appearance API re-exported');

const expected = deployAssets(process.cwd());
const match = sw.match(/const CORE = (\[[^;]+\]);/);
must(match != null, 'generated service worker asset manifest missing');
const actual = JSON.parse(match[1]);
must(JSON.stringify(actual) === JSON.stringify(expected), 'service worker asset list drift');

// Wordle must resolve its vendored UI kit directly; the old nested solid-ui submodule is gone.
const wordleTsconfig = readFileSync("wordle/tsconfig.app.json", "utf8");
if (wordleTsconfig.includes("baseUrl") || wordleTsconfig.includes("submodules/solid-ui")) {
  throw new Error("Wordle TypeScript config references the removed solid-ui submodule/baseUrl");
}
if (!wordleTsconfig.includes('"~/*": ["./src/ui-kit/*"]')) {
  throw new Error("Wordle TypeScript alias must target src/ui-kit");
}

console.log('architecture verification: OK');
