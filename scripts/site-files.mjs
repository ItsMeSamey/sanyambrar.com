import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

export const SOURCE_DIRS = new Set(['.git', 'keybr', 'wordle', 'node_modules', 'scripts']);

export function walkFiles(root, { skip = SOURCE_DIRS, accept = () => true } = {}) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && accept(path, entry.name)) files.push(path);
    }
  };
  walk(root);
  return files.sort();
}

export const htmlPages = (root) => walkFiles(root, { accept: (_path, name) => name.endsWith('.html') });

export const deployAssets = (root) => walkFiles(root, {
  accept: (_path, name) => /\.(?:html|css|js)$/.test(name) && name !== 'sw.js',
}).map((path) => relative(root, path).replaceAll('\\', '/'));
