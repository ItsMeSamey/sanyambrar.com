import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
const root = process.cwd();
const skip = new Set(['.git', 'keybr', 'wordle', 'node_modules']);
const pages = [];
const walk = dir => { for (const e of readdirSync(dir,{withFileTypes:true})) { if(skip.has(e.name)) continue; const p=join(dir,e.name); if(e.isDirectory()) walk(p); else if(e.isFile()&&e.name.endsWith('.html')) pages.push(p); } };
walk(root);
for (const p of pages) {
  const raw=readFileSync(p), gz=`${p}.gz`, br=`${p}.br`;
  if(!existsSync(gz)||!existsSync(br)) throw new Error(`missing compressed sibling for ${relative(root,p)}`);
  if(!gunzipSync(readFileSync(gz)).equals(raw)) throw new Error(`gzip drift: ${relative(root,p)}`);
  if(!brotliDecompressSync(readFileSync(br)).equals(raw)) throw new Error(`brotli drift: ${relative(root,p)}`);
}
console.log(`compressed pages verification: OK (${pages.length} pages)`);
