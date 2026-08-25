const CACHE_PREFIX = 'samey-site-';
const CACHE = `${CACHE_PREFIX}v10`;
const ROOT = new URL('./', self.registration.scope);
const CORE = ['index.html','theme.js','site.css','keybr.html','wordle.html','blog/index.html','blog/blog.css','blog/posts/btop-mutex.html','blog/btop-lock.js'];

self.addEventListener('install', event => {
  event.waitUntil(Promise.all([
    caches.open(CACHE).then(cache => cache.addAll(CORE.map(path => new URL(path, ROOT)))),
    self.skipWaiting(),
  ]));
});

self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key))
    )),
    self.clients.claim(),
  ]));
});

const offlineNavigation = async request => {
  const cached = await caches.match(request);
  if (cached) return cached;

  const url = new URL(request.url);
  if (url.pathname.endsWith('/')) {
    const directoryIndex = await caches.match(new URL('index.html', url));
    if (directoryIndex) return directoryIndex;
  }

  return caches.match(new URL('index.html', ROOT));
};

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        return offlineNavigation(event.request);
      }
    })());
    return;
  }

  const refresh = fetch(event.request).then(async response => {
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(event.request, response.clone());
    }
    return response;
  });

  event.respondWith(caches.match(event.request).then(cached => cached || refresh).catch(() => refresh));
  event.waitUntil(refresh.catch(() => undefined));
});
