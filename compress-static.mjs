import { readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';

const root = process.cwd();
const skip = new Set(['.git', 'keybr', 'wordle', 'node_modules']);
const pages = [];
const walk = dir => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.isFile() && entry.name.endsWith('.html')) pages.push(path);
  }
};
walk(root);
pages.sort();
for (const page of pages) {
  const input = readFileSync(page);
  writeFileSync(`${page}.gz`, gzipSync(input, { level: 9, mtime: 0 }));
  writeFileSync(`${page}.br`, brotliCompressSync(input, { params: { [constants.BROTLI_PARAM_QUALITY]: 9, [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT } }));
  console.log(`compressed ${relative(root, page)}`);
}
// Remove stale sidecars for pages which no longer exist.
const clean = dir => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) clean(path);
    else if (entry.isFile() && (entry.name.endsWith('.html.gz') || entry.name.endsWith('.html.br'))) {
      const source = path.replace(/\.(?:gz|br)$/, '');
      if (!existsSync(source)) unlinkSync(path);
    }
  }
};
clean(root);
