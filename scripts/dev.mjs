import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
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
const transitionBridgeUrl = target === 'keybr' ? '/@fs' + resolve(root, 'src/shared/transition-bridge.js') : '/src/shared/transition-bridge.js';
const siteRuntimeUrl = target === 'site' ? '/src/site/main.tsx' : '/@fs' + resolve(root, 'src/site/main.tsx');
const siteSourcePages = new Map([
  ['/wordle', 'src/games/wordle/index.html'],
  ['/keybr', 'src/games/keybr/index.html'],
  ['/blog/1', 'src/blogs/btop-mutex.html'],
  ['/blog/2', 'src/site/public/blog/2/index.html'],
]);
const linkedCss = {
  shared: 'src/shared/styles/site.css',
  home: 'src/site/styles/home.css',
  tools: 'src/tools/style.css',
  settings: 'src/shared/styles/game-settings.css',
  chain: 'src/games/chain/style.css',
  wordle: 'src/games/wordle/style.css',
  keybr: 'src/games/keybr/style.css',
  article: 'src/blogs/btop-mutex.css',
};
const sharedCss = [linkedCss.shared, linkedCss.settings];
const linkedCssFiles = new Set(Object.values(linkedCss).map(file => resolve(root, file)));
const routeKindFor = (path, htmlFile) => {
  if (htmlFile.endsWith('/src/games/wordle/index.html')) return 'wordle';
  if (htmlFile.endsWith('/src/games/keybr/index.html')) return 'keybr';
  if (htmlFile.endsWith('/src/blogs/btop-mutex.html')) return 'article';
  const key = path !== '/' ? path.replace(/\/$/, '').replace(/\.html$/, '') : path;
  if (key === '/') return 'home';
  if (key === '/work') return 'work';
  if (key === '/tools') return 'tools';
  if (key === '/chain') return 'chain';
  if (key === '/blog') return 'blog';
  if (key.startsWith('/projects/')) return 'project';
  return 'home';
};
const routeCssFor = (path, htmlFile) => {
  const key = path !== '/' ? path.replace(/\/$/, '').replace(/\.html$/, '') : path;
  if (htmlFile.endsWith('/src/games/wordle/index.html')) return [linkedCss.wordle];
  if (htmlFile.endsWith('/src/games/keybr/index.html')) return [linkedCss.keybr];
  if (htmlFile.endsWith('/src/blogs/btop-mutex.html')) return [linkedCss.article];
  if (key === '/tools') return [linkedCss.tools];
  if (key === '/chain') return [linkedCss.chain];
  return [linkedCss.home];
};
const hrefForSourceCss = file => target === 'keybr' ? '/@fs' + resolve(root, file) : '/' + file;
const devStyleLinks = (path, htmlFile) => {
  const kind = routeKindFor(path, htmlFile);
  const links = [
    '<style data-samey-dev-view-transition>@view-transition{navigation:auto}</style>',
    `<script data-samey-transition-bridge src="${transitionBridgeUrl}"></script>`,
    ...sharedCss.map(file => `<link rel="stylesheet" data-samey-shared data-samey-dev-style="${file}" href="${hrefForSourceCss(file)}">`),
    ...routeCssFor(path, htmlFile).map(file => `<link rel="stylesheet" data-samey-route-style data-samey-route-owner="${kind}" data-samey-dev-style="${file}" href="${hrefForSourceCss(file)}">`),
  ];
  if (target === 'site' && ['home','work','tools','chain','blog','project'].includes(kind))
    links.push('<meta name="samey-route-assets" content="/@samey-route-assets.json">');
  return links.join('');
};
const devRouteAssets = {
  home: [hrefForSourceCss(linkedCss.home)],
  work: [hrefForSourceCss(linkedCss.home)],
  tools: [hrefForSourceCss(linkedCss.tools)],
  chain: [hrefForSourceCss(linkedCss.chain)],
  blog: [hrefForSourceCss(linkedCss.home)],
  project: [hrefForSourceCss(linkedCss.home)],
};
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
    name: 'samey-inline-development-css',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split('?', 1)[0];
      if (!/\.[cm]?[jt]sx?$/.test(file)) return;
      let changed = false;
      const next = code.replace(/^\s*import\s+["']([^"']+\.css)["'];?\s*$/gm, (statement, specifier) => {
        const target = resolve(dirname(file), specifier);
        if (!linkedCssFiles.has(target)) return statement;
        changed = true;
        return '';
      });
      if (changed) return { code: next, map: null };
    },
    configureServer(server) {
      server.watcher.on('change', file => {
        if (linkedCssFiles.has(file)) server.ws.send({ type: 'full-reload', path: '*' });
      });
    },
  }, {
    name: 'samey-development-pages',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        try {
          const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
          const legacy = path.replace(/\/$/, '').replace(/\/index\.html$/, '').replace(/\.html$/, '');
          const destination = legacy === '/blog/sealed' ? '/blog/2' : legacy === '/blog/posts/btop-mutex' ? '/blog/1' : null;
          if (target === 'site' && destination) {
            response.writeHead(308, { Location: destination + new URL(request.url, 'http://localhost').search });
            response.end();
            return;
          }
          if (target === 'site' && /^\/blog\/2\/(?:payload\.bin|blobs\/[a-f0-9]{64}\.bin)$/.test(path)) {
            response.setHeader('Content-Type', 'application/octet-stream');
            response.setHeader('Cache-Control', 'no-store');
            response.end(await readFile(resolve(root, 'src/site/public', '.' + path)));
            return;
          }
          if (target === 'site' && path === '/@samey-route-assets.json') {
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify(devRouteAssets));
            return;
          }
          const file = resolve(docs, '.' + path);
          if (file !== docs && !file.startsWith(docs + sep)) return next();
          const htmlFile = await htmlFileFor(path);
          if (htmlFile) {
            let html = await readFile(htmlFile, 'utf8');
            html = html.replace(/<html(?=\s|>)/i, '<html data-samey-dev');
            html = html
              .replace(/<link\b[^>]*\bdata-samey-shared\b[^>]*>\s*/gi, '')
              .replace(/<style\b[^>]*\bdata-samey-(?:shared|inline-shell)\b[^>]*>[\s\S]*?<\/style>\s*/gi, '')
              .replace(/<script\b[^>]*\bsrc=["'][^"']*shared-runtime\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi, '')
              .replace(/<script\b[^>]*\bdata-samey-(?:shared-runtime|inline-runtime)\b[^>]*>[\s\S]*?<\/script>\s*/gi, '')
              .replace(/<script\b[^>]*\bdata-samey-inline-asset-guard\b[^>]*>[\s\S]*?<\/script>\s*/gi, '')
              .replace(/<script\b[^>]*\bdata-samey-inline-importmap\b[^>]*>[\s\S]*?<\/script>\s*/gi, '')
              .replace(/<script\b[^>]*\bdata-samey-site-entry\b[^>]*>[\s\S]*?<\/script>\s*/gi, '')
              .replace(/<link\b[^>]*\bdata-samey-route-module\b[^>]*>\s*/gi, '')
              .replace(/<link\b[^>]*\bdata-samey-route-style\b[^>]*>\s*/gi, '')
              .replace(/<meta\b[^>]*\bname=["']samey-route-assets["'][^>]*>\s*/gi, '')
              .replace(/<style\b[^>]*\bdata-samey-route-style\b[^>]*>[\s\S]*?<\/style>\s*/gi, '');
            html = html.replace('</head>', `${devStyleLinks(path, htmlFile)}</head>`);
            if (!html.includes(sharedRuntimeUrl))
              html = html.replace('</head>', `<script type="module" data-samey-shared-runtime src="${sharedRuntimeUrl}"></script></head>`);
            if (target === 'site' && html.includes('id="site-root"') && !html.includes(siteRuntimeUrl)) {
              const rewritten = html.replace(/src="[^"\s]*site-chunks\/site-app-[^"\s]+\.js"/, `src="${siteRuntimeUrl}"`);
              html = rewritten.includes(siteRuntimeUrl)
                ? rewritten
                : rewritten.replace('</head>', `<script type="module" src="${siteRuntimeUrl}"></script></head>`);
            }
            if (target === 'site' && htmlFile.endsWith('/src/games/keybr/index.html'))
              html = html.replace('src="/main.tsx"', 'src="/src/games/keybr/main.tsx"');
            if (target === 'site' && htmlFile.endsWith('/src/blogs/btop-mutex.html'))
              html = html.replace('src="./shell.tsx"', 'src="/src/blogs/shell.tsx"');
            if (target === 'site' && htmlFile.endsWith('/src/site/public/blog/2/index.html'))
              html = html.replace('src="./reader.js"', 'src="/src/site/public/blog/2/reader.js"').replace('href="./reader.css"', 'href="/src/site/public/blog/2/reader.css"').replace('src="../../../../blogs/article-chrome.tsx"', 'src="/src/blogs/article-chrome.tsx"');
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
