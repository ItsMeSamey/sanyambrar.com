import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'keybr/packages';
const files = [];
const walk = dir => {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const path = join(dir, name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) walk(path);
    else if (path.endsWith('.less')) files.push(path);
  }
};
walk(root);

const used = new Set();
const defined = new Set();
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) used.add(match[1]);
  for (const match of text.matchAll(/(^|[;{]\s*)(--[A-Za-z0-9_-]+)\s*:/gm)) defined.add(match[2]);
}
const missing = [...used].filter(name => !defined.has(name)).sort();
if (missing.length) throw new Error(`Keybr CSS variables used but never defined:\n${missing.join('\n')}`);

const theme = readFileSync('theme.js', 'utf8');
const keybrGuard = 'if (root.dataset.siteKind === "wordle")';
if (!theme.includes(keybrGuard)) throw new Error('Wordle palette variables are not scoped away from Keybr');
for (const name of ['--primary', '--secondary', '--accent']) {
  const position = theme.indexOf(`setProperty("${name}"`);
  const guard = theme.indexOf(keybrGuard);
  if (position < guard) throw new Error(`${name} is written outside the Wordle-only scope`);
}
console.log(`Keybr theme audit: OK (${used.size} variables used, ${defined.size} defined)`);
