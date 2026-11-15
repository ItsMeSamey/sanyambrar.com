import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';

const docs = resolve(import.meta.dirname, '../docs');
const origin = 'https://sanyambrar.com';
const html = await readFile(resolve(docs, 'afterimage/index.html'), 'utf8');
assert.match(html, /data-site-kind="afterimage"/);
assert.doesNotMatch(html, /data-site-spa/);
assert.match(html, /@view-transition\{navigation:auto\}/);
assert.match(html, /href="\/afterimage\/manifest.webmanifest"/);
for (const pattern of [
  /href="(\/shared\/site-[a-f0-9]+\.css)"/,
  /src="(\/shared\/runtime-[a-f0-9]+\.js)"/,
  /src="(\/shared\/transition-bridge-[a-f0-9]+\.js)"/,
  /href="(\/afterimage\/assets\/[^"\s]+\.css)"/,
  /src="(\/afterimage\/assets\/[^"\s]+\.js)"/,
]) {
  const match = html.match(pattern);
  assert.ok(match, `Missing document dependency: ${pattern}`);
  assert.ok((await stat(resolve(docs, '.' + match[1]))).isFile());
}
const manifest = JSON.parse(await readFile(resolve(docs, 'afterimage/manifest.webmanifest'), 'utf8'));
for (const field of ['id', 'start_url', 'scope']) assert.equal(manifest[field], '/afterimage/');
for (const icon of manifest.icons) {
  assert.ok(icon.src.startsWith('/afterimage/icons/'));
  assert.ok((await stat(resolve(docs, '.' + icon.src))).isFile());
}

// Exercise the published worker with an unavailable network and an in-memory
// cache so directory navigation and split asset coverage are checked together.
const worker = await readFile(resolve(docs, 'sw.js'), 'utf8');
const core = JSON.parse(worker.match(/const CORE = (\[[^\n]+\]);/)[1]);
const afterimageFiles = [];
const collect = async directory => {
  for (const entry of await readdir(resolve(docs, directory), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await collect(path);
    else afterimageFiles.push(path);
  }
};
await collect('afterimage');
let bytes = 0;
for (const file of afterimageFiles) {
  assert.ok(core.includes(file), `Offline precache is missing ${file}`);
  bytes += (await stat(resolve(docs, file))).size;
}
const handlers = new Map();
const cached = new Map();
const cacheKey = request => typeof request === 'string' ? new URL(request, origin).href : request.url ?? request.href;
const cache = {
  async addAll(urls) { for (const url of urls) cached.set(url.href, `cached:${url.href}`); },
  async match(request) { const body = cached.get(cacheKey(request)); return body ? new Response(body) : undefined; },
  async put(request, response) { cached.set(cacheKey(request), await response.text()); },
};
vm.runInNewContext(worker, {
  URL, Response,
  location: { origin },
  self: {
    registration: { scope: origin + '/' },
    addEventListener: (name, handler) => handlers.set(name, handler),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  },
  caches: { open: async () => cache },
  fetch: async () => { throw new TypeError('Network unavailable'); },
});
let installed;
handlers.get('install')({ waitUntil: promise => { installed = promise; } });
await installed;
for (const [route, expected] of [
  ['/afterimage/', '/afterimage/index.html'],
  ['/afterimage', '/afterimage/index.html'],
  ['/afterimage/?game=grid', '/afterimage/index.html'],
  ['/wordle', '/wordle.html'],
  ['/keybr', '/keybr.html'],
  ['/chain/', '/chain/index.html'],
]) {
  let response;
  handlers.get('fetch')({
    request: { url: origin + route, method: 'GET', mode: 'navigate' },
    respondWith: promise => { response = promise; },
  });
  assert.equal(await (await response).text(), 'cached:' + origin + expected, `Offline navigation failed: ${route}`);
}
for (const file of afterimageFiles.filter(file => file.startsWith('afterimage/assets/'))) {
  let response;
  handlers.get('fetch')({
    request: { url: origin + '/' + file, method: 'GET', mode: 'cors' },
    respondWith: promise => { response = promise; },
  });
  assert.equal(await (await response).text(), 'cached:' + origin + '/' + file);
}
console.log(`Afterimage build verified: ${afterimageFiles.length} offline files, ${(bytes / 1024).toFixed(1)} KiB added to the site precache; scoped manifest, shared shell, and offline routes passed.`);
