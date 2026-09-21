import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createServer } from 'vite';

const root = resolve(import.meta.dirname, '..');
const target = process.argv[2] ?? 'site';
const targets = {
  site: { port: 4320 },
  wordle: { port: 4321, html: 'src/games/wordle/index.html', route: '/wordle' },
  keybr: { port: 4322, html: 'src/games/keybr/index.html', route: '/keybr' },
};
if (!Object.hasOwn(targets, target)) throw new Error('Expected site, wordle, or keybr');
const settings = targets[target];
const requestedPort = Number(process.env.SAMEY_DEV_PORT ?? settings.port);
if (!Number.isSafeInteger(requestedPort) || requestedPort < 1024 || requestedPort > 65535) throw new Error('SAMEY_DEV_PORT must be a valid port');
const docs = resolve(root, 'docs');
const sharedRuntimeUrl = target === 'keybr'
  ? '/@fs' + resolve(root, 'src/shared/runtime.ts')
  : '/src/shared/runtime.ts';
const siteRuntimeUrl = target === 'site' ? '/src/site/main.tsx' : '/@fs' + resolve(root, 'src/site/main.tsx');
const siteSourcePages = new Map([
  ['/wordle', 'src/games/wordle/index.html'],
  ['/keybr', 'src/games/keybr/index.html'],
  ['/blog/posts/btop-mutex', 'src/blogs/btop-mutex.html'],
]);
process.env.SAMEY_VITE_BUILD = target;
const mime = { '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };

const existingFile = async file => {
  try { return (await stat(file)).isFile() ? file : null; }
  catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return null;
    throw error;
  }
};

const htmlFileFor = async path => {
  if (settings.html && (path === '/' || path === settings.route || path === settings.route + '.html'))
    return resolve(root, settings.html);
  if (target === 'site') {
    const key = path !== '/' ? path.replace(/\/$/, '').replace(/\.html$/, '') : path;
    const source = siteSourcePages.get(key);
    if (source) return resolve(root, source);
  }
  if (path.endsWith('/')) return existingFile(resolve(docs, '.' + path, 'index.html'));
  if (path.endsWith('.html')) return existingFile(resolve(docs, '.' + path));
  if (!extname(path)) {
    return await existingFile(resolve(docs, '.' + path + '.html'))
      ?? existingFile(resolve(docs, '.' + path, 'index.html'));
  }
  return null;
};

const server = await createServer({
  configFile: resolve(root, 'vite.config.ts'),
  cacheDir: resolve(root, `.tmp/vite-${target}-${requestedPort}`),
  server: {
    host: '127.0.0.1',
    port: requestedPort,
    strictPort: true,
    watch: { ignored: ['**/.tmp/**', '**/docs/**', '**/.build/**'] },
  },
  plugins: [{
    name: 'samey-development-pages',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        try {
          const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
          const file = resolve(docs, '.' + path);
          if (file !== docs && !file.startsWith(docs + sep)) return next();
          const htmlFile = await htmlFileFor(path);
          if (htmlFile) {
            let html = await readFile(htmlFile, 'utf8');
            html = html.replace(/<html(?=\s|>)/i, '<html data-samey-dev');
            html = html
              .replace(/<link\b[^>]*\bdata-samey-shared\b[^>]*>\s*/gi, '')
              .replace(/<script\b[^>]*\bsrc=["'][^"']*shared-runtime\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi, '')
              .replace(/<link\b[^>]*\bdata-samey-route-module\b[^>]*>\s*/gi, '')
              .replace(/<style\b[^>]*\bdata-samey-route-style\b[^>]*>[\s\S]*?<\/style>\s*/gi, '');
            if (!html.includes(sharedRuntimeUrl))
              html = html.replace('</head>', `<script type="module" src="${sharedRuntimeUrl}"></script></head>`);
            html = html.replace(/src="[^"\s]*site-chunks\/site-app-[^"\s]+\.js"/, `src="${siteRuntimeUrl}"`);
            if (target === 'site' && htmlFile.endsWith('/src/games/keybr/index.html'))
              html = html.replace('src="/main.tsx"', 'src="/src/games/keybr/main.tsx"');
            if (target === 'site' && htmlFile.endsWith('/src/blogs/btop-mutex.html'))
              html = html.replace('src="./shell.tsx"', 'src="/src/blogs/shell.tsx"');
            html = html.replace(/(<link\b[^>]*\brel=["']icon["'][^>]*\bhref=)["'][^"']*["']/i, '$1"/favicon.svg"');
            if (!html.includes('rel="icon"')) html = html.replace('</head>', '<link rel="icon" href="/favicon.svg"></head>');
            html = await server.transformIndexHtml(path, html);
            response.setHeader('Content-Type', 'text/html');
            response.end(html);
            return;
          }
          if (!mime[extname(file)] || !(await stat(file)).isFile()) return next();
          response.setHeader('Content-Type', mime[extname(file)]);
          response.end(await readFile(file));
        } catch (error) {
          if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return next();
          next(error);
        }
      });
    },
  }],
});
await server.listen();
server.printUrls();
