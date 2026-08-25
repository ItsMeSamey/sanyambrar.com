import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { htmlPages } from './scripts/site-files.mjs';

const root = process.cwd();
const pages = htmlPages(root);

const fail = (message) => { throw new Error(message); };
for (const path of pages) {
  const html = readFileSync(path, 'utf8');
  const name = relative(root, path);
  if (!/<script\s+src=["'][^"']*appearance\.generated\.js["']><\/script>/i.test(html)) fail(`${name}: missing generated appearance config`);
  if (!/<script\s+src=["'][^"']*theme\.js["']><\/script>/i.test(html)) fail(`${name}: missing shared theme/runtime script`);
  if (!/data-home-href=|data-back-href=/i.test(html)) fail(`${name}: missing shared navigation metadata`);
}

const theme = readFileSync(join(root, 'theme.js'), 'utf8');
const css = readFileSync(join(root, 'site.css'), 'utf8');
const requiredTheme = [
  'samey-site-controls',
  'samey-context-menu',
  'samey-cursor-grab',
  'samey-vscroll-thumb',
  'samey-hscroll-thumb',
  'pointerrawupdate',
  'contextmenu',
  'getDisplayMedia',
  'history.pushState',
  'popstate',
  'X-Samey-SPA',
  'Copy',
  'Paste',
  'Select all',
  'Screenshot…',
  '<rect x="29" y="16" width="6" height="7" fill="black"/>',
  '<rect x="16" y="29" width="7" height="6" fill="black"/>',
];
for (const token of requiredTheme) if (!theme.includes(token)) fail(`theme.js: missing runtime contract ${token}`);
const requiredCss = ['::selection', '.samey-site-controls', 'left:12px', 'cursor:none!important', '.samey-context-menu', '.samey-vscroll', '.samey-hscroll'];
for (const token of requiredCss) if (!css.includes(token)) fail(`site.css: missing shared UI contract ${token}`);

const post = readFileSync(join(root, 'blog/posts/btop-mutex.html'), 'utf8');
if (!post.includes("<h1>btop's broken lock</h1>")) fail('blog post title drift');
if (!post.includes('<p class="dek">the mutex that wasn\'t</p>')) fail('blog post subtitle drift');

console.log(`site contract verification: OK (${pages.length} pages)`);
