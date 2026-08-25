import { existsSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { htmlPages } from './scripts/site-files.mjs';

const root = process.cwd();
const pages = htmlPages(root);
for (const page of pages) {
  const raw = readFileSync(page), gz = `${page}.gz`, br = `${page}.br`;
  if (!existsSync(gz) || !existsSync(br)) throw new Error(`missing compressed sibling for ${relative(root, page)}`);
  if (!gunzipSync(readFileSync(gz)).equals(raw)) throw new Error(`gzip drift: ${relative(root, page)}`);
  if (!brotliDecompressSync(readFileSync(br)).equals(raw)) throw new Error(`brotli drift: ${relative(root, page)}`);
}
console.log(`compressed pages verification: OK (${pages.length} pages)`);
