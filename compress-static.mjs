import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { htmlPages, walkFiles } from './scripts/site-files.mjs';

const root = process.cwd();
const pages = htmlPages(root);
for (const page of pages) {
  const input = readFileSync(page);
  writeFileSync(`${page}.gz`, gzipSync(input, { level: 9, mtime: 0 }));
  writeFileSync(`${page}.br`, brotliCompressSync(input, { params: {
    [constants.BROTLI_PARAM_QUALITY]: 9,
    [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
  } }));
  console.log(`compressed ${relative(root, page)}`);
}

for (const sidecar of walkFiles(root, { accept: (_path, name) => /\.html\.(?:gz|br)$/.test(name) })) {
  if (!existsSync(sidecar.replace(/\.(?:gz|br)$/, ''))) unlinkSync(sidecar);
}
