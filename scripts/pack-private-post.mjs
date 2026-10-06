import { chmod, mkdir, readFile, readdir, realpath, unlink, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importKey, sealBytes } from '../src/site/public/blog/2/crypto.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv.length !== 3) throw Error('Usage: bun scripts/pack-private-post.mjs <private-source-directory-outside-site>');
const source = await realpath(resolve(process.argv[2]));
const withinSite = relative(root, source);
if (!withinSite || (!withinSite.startsWith('..' + sep) && !isAbsolute(withinSite))) throw Error('Keep plaintext and keys outside the site repository.');
const articlePath = resolve(source, 'article.md');
const manifest = JSON.parse(await readFile(resolve(source, 'manifest.json'), 'utf8'));
if (typeof manifest.title !== 'string' || !Array.isArray(manifest.assets)) throw Error('Invalid private manifest');
const markdown = await readFile(articlePath, 'utf8');
const html = Bun.markdown.html(markdown);
const secretDirectory = resolve(source, 'secrets');
const mediumDirectory = resolve(source, 'medium');
await mkdir(secretDirectory, { recursive: true, mode: 0o700 });
await mkdir(mediumDirectory, { recursive: true, mode: 0o700 });
await chmod(source, 0o700);
await chmod(secretDirectory, 0o700);
await chmod(mediumDirectory, 0o700);
await chmod(articlePath, 0o600);
const keyPath = resolve(secretDirectory, 'key.txt');
let keyText;
try {
  keyText = (await readFile(keyPath, 'utf8')).trim();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  keyText = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
  await writeFile(keyPath, keyText + '\n', { flag: 'wx', mode: 0o600 });
}
await chmod(keyPath, 0o600);
const outputDirectory = resolve(root, 'src/site/public/blog/2');
const blobDirectory = resolve(outputDirectory, 'blobs');
await mkdir(blobDirectory, { recursive: true });
const key = await importKey(keyText, ['encrypt']);
const assets = Object.create(null);
const encryptedAssets = Object.create(null);
for (const asset of manifest.assets) {
  if (!/^[a-zA-Z0-9._-]+$/.test(asset.name) || Object.hasOwn(assets, asset.name)) throw Error('Invalid or duplicate asset name');
  if (!['image/jpeg', 'image/png', 'image/webp', 'application/octet-stream'].includes(asset.mime)) throw Error('Unsupported asset type');
  let bytes = await readFile(resolve(source, asset.source));
  if (asset.resetThreadAllowlist) {
    const original = bytes.toString('utf8');
    const sanitized = original.replace(/const THREAD_IDS = new Set\(\[[\s\S]*?\]\);/, 'const THREAD_IDS = new Set([]);');
    if (original === sanitized) throw Error('Expected thread allowlist was not found');
    bytes = Buffer.from(sanitized);
  }
  if (asset.mime === 'application/octet-stream' && /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(bytes.toString('utf8'))) throw Error('Remove private thread IDs before packaging attachments');
  assets[asset.name] = { mime: asset.mime, data: bytes.toString('base64') };
  const id = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
  encryptedAssets[asset.name] = { mime: asset.mime, id };
  await writeFile(resolve(blobDirectory, id + '.bin'), await sealBytes(bytes, key, id));
  const directory = resolve(mediumDirectory, asset.mime.startsWith('image/') ? 'images' : 'attachments');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(resolve(directory, asset.name), bytes, { mode: 0o600 });
}
const privateBytes = new TextEncoder().encode(JSON.stringify({ version: 2, html, assets: encryptedAssets }));
await writeFile(resolve(outputDirectory, 'payload.bin'), await sealBytes(privateBytes, key, 'post'));
privateBytes.fill(0);
await unlink(resolve(outputDirectory, 'payload.json')).catch(error => { if (error.code !== 'ENOENT') throw error; });
const currentBlobs = new Set(Object.values(encryptedAssets).map(asset => asset.id + '.bin'));
for (const file of await readdir(blobDirectory)) {
  if (/^[a-f0-9]{64}\.bin$/.test(file) && !currentBlobs.has(file)) await unlink(resolve(blobDirectory, file));
}

function replaceAssets(content, inlineImages) {
  return content.replace(/asset:([a-zA-Z0-9._-]+)/g, (_match, name) => {
    const asset = assets[name];
    if (!asset) throw Error('Article references a missing asset');
    return asset.mime.startsWith('image/')
      ? inlineImages ? `data:${asset.mime};base64,${asset.data}` : `images/${name}`
      : `attachments/${name}`;
  });
}
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const style = 'body{max-width:760px;margin:60px auto;padding:0 22px;font:18px/1.75 Georgia,serif;color:#202020;background:#fff}h1,h2,h3{font-family:system-ui,sans-serif;line-height:1.2}h1{font-size:42px}h2{margin-top:48px}a{color:inherit}pre{white-space:pre-wrap;background:#f4f4f4;padding:20px;font:14px/1.6 monospace;overflow-wrap:anywhere}img{display:block;max-width:100%;max-height:640px;margin:auto}figure{margin:32px 0}figcaption,.meta,.eyebrow{font:13px/1.6 system-ui,sans-serif;color:#666}.dek{font-size:22px;color:#666}blockquote{border-left:2px solid #888;padding-left:20px}';
const readerStyles = await readFile(resolve(outputDirectory, 'reader.css'), 'utf8');
const articleStyles = await readFile(resolve(root, 'src/shared/styles/article.css'), 'utf8');
const exportHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(manifest.title)}</title><style>${style}\n${articleStyles}\n${readerStyles}</style></head><body class="article-route"><main class="sealed-main"><article id="article">${replaceAssets(html, true).replaceAll('<details>', '<details open>')}</article></main></body></html>`;
await writeFile(resolve(mediumDirectory, 'article.html'), exportHtml, { mode: 0o600 });
await writeFile(resolve(mediumDirectory, 'article.md'), replaceAssets(markdown, false), { mode: 0o600 });
await writeFile(resolve(mediumDirectory, 'README.txt'), `PRIVATE PLAINTEXT EXPORT — do not publish or commit accidentally.

article.html contains the same article as the encrypted post, with embedded images.
article.md is the editable Markdown copy. images/ contains the article's recreations;
attachments/ contains the article's userscripts. The decryption key is NOT included.

Medium's documented importer accepts a published URL, not a local file:
https://help.medium.com/hc/en-us/articles/214550207-Importing-a-post-to-Medium

To avoid making a public plaintext URL, open article.html locally, copy the
rendered article into a new Medium draft, and review formatting. Upload the
images from images/ manually if Medium does not preserve pasted images.
Keep the note identifying the screenshots as recreations. Medium will not host local script-download links;
replace those links with destinations you deliberately choose before publishing.
Do not use the encrypted page as an import URL: an importer only sees its lock screen.

Publishing this draft would disclose its plaintext to Medium and its readers.
No Medium draft or public publication was created automatically.
`, { mode: 0o600 });
const zipPath = resolve(source, 'medium-export.zip');
execFileSync('python3', ['-m', 'zipfile', '-c', zipPath, 'article.html', 'article.md', 'images', 'attachments', 'README.txt'], { cwd: mediumDirectory });
await chmod(zipPath, 0o600);
console.log('Encrypted payload and private Medium export created. Key retained in the private source secrets/key.txt; no key printed.');
