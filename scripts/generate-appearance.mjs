import { readFileSync, writeFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('shared/appearance.json', 'utf8'));
const hex = /^#[0-9a-f]{6}$/i;
for (const [id, color] of Object.entries(config.colors)) {
  if (!['light', 'dark'].includes(color.tone)) throw new Error(`appearance: ${id} has invalid tone`);
  for (const key of ['background', 'text', 'accent', 'error', 'slow', 'fast', 'effort']) {
    if (!hex.test(color[key])) throw new Error(`appearance: ${id}.${key} is not #rrggbb`);
  }
}
for (const [id, font] of Object.entries(config.fonts)) {
  if (!font.label || !font.stack) throw new Error(`appearance: incomplete font ${id}`);
}

writeFileSync('appearance.generated.js', `// Generated from shared/appearance.json. Do not edit.\nObject.defineProperty(globalThis, "SameyAppearanceConfig", { value: Object.freeze(${JSON.stringify(config)}), configurable: false, writable: false });\n`);

const lines = ['// Generated from shared/appearance.json. Do not edit.'];
for (const [id, color] of Object.entries(config.colors)) {
  const prefix = `@samey-${id}`;
  for (const key of ['background', 'text', 'accent', 'error', 'slow', 'fast', 'effort']) lines.push(`${prefix}-${key}: ${color[key]};`);
}
writeFileSync('keybr/packages/keybr-themes/lib/themes/site-presets.generated.less', `${lines.join('\n')}\n`);
console.log(`appearance: ${Object.keys(config.colors).length} themes, ${Object.keys(config.fonts).length} fonts`);
