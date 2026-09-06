import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createServer } from 'vite';

const root = resolve(import.meta.dirname, '..');
const target = process.argv[2] ?? 'site';
const targets = {
  site: { config: 'vite.site.config.ts', port: 4320 },
  wordle: { config: 'vite.config.ts', port: 4321, html: 'src/games/wordle/index.html' },
  keybr: { config: 'src/games/keybr/vite.config.ts', port: 4322, html: 'src/games/keybr/index.html' },
};
if (!Object.hasOwn(targets, target)) throw new Error('Expected site, wordle, or keybr');
const settings = targets[target];
const port = Number(process.env.PORT ?? settings.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError('Invalid development server port');
const docs = resolve(root, 'docs');
const mime = { '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };

const server = await createServer({
  configFile: resolve(root, settings.config),
  cacheDir: resolve(root, `.tmp/vite-${target}`),
  server: { host: '127.0.0.1', port, strictPort: true },
  plugins: [{
    name: 'samey-development-pages',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        try {
          const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
          const file = resolve(docs, '.' + path, path.endsWith('/') ? 'index.html' : '');
          if (!file.startsWith(docs + sep)) return next();
          if (path.endsWith('/') || path.endsWith('.html')) {
            let html = await readFile(settings.html ? resolve(root, settings.html) : file, 'utf8');
            if (target === 'site') html = html.replace(/src="[^"\s]*site-chunks\/site-app-[^"\s]+\.js"/, 'src="/src/site/main.tsx"');
            if (!html.includes('shared-runtime.js')) html = html.replace('</head>', '<link rel="stylesheet" href="/site.css" data-samey-shared><script src="/shared-runtime.js"></script></head>');
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
