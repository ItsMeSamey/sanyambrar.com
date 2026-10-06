import { importKey, openBytes, openPost } from './crypto.js';
import { highlightArticleCode } from '../../../../shared/article-code.ts';

const form = document.getElementById('unlock-form');
const input = document.getElementById('decryption-key');
const status = document.getElementById('unlock-status');
const button = document.getElementById('unlock');
const locked = document.getElementById('locked');
const unlocked = document.getElementById('unlocked');
const article = document.getElementById('article');
const articleId = document.querySelector('meta[name="article-id"]').content;
if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(articleId)) throw Error('Missing article identity');
const storageKey = 'samey.article.key.' + articleId;
const objectUrls = new Set();
const sectionIdPattern = /^article-section-[1-9]\d*$/;
let generation = 0;
let controller;
let activeKey = '';

class ArticleLoadError extends Error {}

function savedKey() {
  try { return localStorage.getItem(storageKey) || ''; } catch { return ''; }
}

function forgetKey() {
  try { localStorage.removeItem(storageKey); } catch { /* Storage may be unavailable. */ }
}

function publishState() {
  document.documentElement.dataset.articleUnlocked = String(!unlocked.hidden);
  document.documentElement.dataset.articleHasKey = String(Boolean(activeKey || savedKey()));
  dispatchEvent(new Event('samey-article-state'));
}

function addReadingTools(fragment, current) {
  highlightArticleCode(fragment, 'javascript');
  const title = fragment.querySelector('h1');
  const meta = fragment.querySelector('.meta');
  if (title) {
    const header = document.createElement('header');
    header.className = 'article-head';
    title.before(header);
    header.append(title);
    if (meta) header.append(meta);
  }
  const headings = [...fragment.querySelectorAll('h2')];
  const reservedIds = new Set(headings.map(heading => heading.id).filter(Boolean));
  let nextSection = 1;
  for (const heading of headings) {
    if (!heading.id) {
      while (reservedIds.has('article-section-' + nextSection)) nextSection++;
      heading.id = 'article-section-' + nextSection++;
      reservedIds.add(heading.id);
    }
    heading.tabIndex = -1;
  }
  const overview = fragment.querySelector('nav.article-overview');
  if (overview) overview.setAttribute('aria-label', 'Article sections');
  else if (headings.length > 1) {
    const navigation = document.createElement('nav');
    navigation.className = 'article-sections';
    navigation.setAttribute('aria-label', 'Article sections');
    for (const heading of headings) {
      const link = document.createElement('a');
      link.href = '#' + heading.id;
      link.textContent = heading.textContent;
      navigation.append(link);
    }
    headings[0].before(navigation);
  }
  const sectionTargets = new Map(headings.map(heading => ['#' + heading.id, heading]));
  for (const link of fragment.querySelectorAll('a[href^="#article-section-"]')) {
    const heading = sectionTargets.get(link.getAttribute('href'));
    if (!heading) continue;
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (current !== generation) return;
      heading.scrollIntoView({ block: 'start' });
      heading.focus({ preventScroll: true });
    });
  }
  for (const pre of fragment.querySelectorAll('pre')) {
    pre.tabIndex = 0;
    const label = pre.previousElementSibling;
    const wrapper = document.createElement('div');
    wrapper.className = 'code-example';
    const toolbar = document.createElement('div');
    toolbar.className = 'code-tools';
    if (label?.matches('div.code-label')) toolbar.append(label);
    const message = document.createElement('span');
    message.className = 'copy-status';
    message.setAttribute('role', 'status');
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.setAttribute('aria-label', 'Copy code');
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '1.6');
    icon.setAttribute('stroke-linecap', 'round');
    icon.setAttribute('stroke-linejoin', 'round');
    icon.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M9 9h11v11H9zM5 15H4V4h11v1');
    icon.append(path);
    copyButton.append(icon, 'Copy');
    copyButton.addEventListener('click', async () => {
      if (current !== generation || copyButton.disabled) return;
      copyButton.disabled = true;
      message.textContent = '';
      try {
        await navigator.clipboard.writeText(pre.textContent);
        if (current === generation) message.textContent = 'Copied';
      } catch {
        if (current === generation) message.textContent = 'Could not copy. Select the code to copy it.';
      } finally {
        copyButton.disabled = false;
      }
    });
    toolbar.append(message, copyButton);
    pre.before(wrapper);
    wrapper.append(toolbar, pre);
  }
}

function lock(focus = false) {
  generation++;
  controller?.abort();
  controller = undefined;
  activeKey = '';
  article.replaceChildren();
  for (const url of objectUrls) URL.revokeObjectURL(url);
  objectUrls.clear();
  input.value = '';
  input.removeAttribute('aria-invalid');
  status.textContent = '';
  button.disabled = false;
  unlocked.hidden = true;
  locked.hidden = false;
  publishState();
  if (focus) input.focus();
}

function lockArticle() {
  forgetKey();
  if (location.hash.startsWith('#key=')) history.replaceState(history.state, '', location.pathname + location.search);
  lock(true);
}

async function fetchEncrypted(path, signal) {
  try {
    const response = await fetch(new URL(path, location.origin), {
      credentials: 'omit', cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
    });
    if (!response.ok || response.headers.get('content-type')?.includes('text/html') || Number(response.headers.get('content-length')) > 8_000_032) throw new ArticleLoadError();
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 8_000_032) throw new ArticleLoadError();
    return bytes;
  } catch {
    throw new ArticleLoadError();
  }
}

async function renderArticle(payload, key, signal, current) {
  const template = document.createElement('template');
  template.innerHTML = payload.html;
  const allowed = new Set(['H1', 'H2', 'H3', 'P', 'STRONG', 'EM', 'CODE', 'PRE', 'A', 'UL', 'OL', 'LI', 'FIGURE', 'FIGCAPTION', 'IMG', 'DIV', 'SPAN', 'BLOCKQUOTE', 'HR', 'BR', 'HEADER', 'SECTION', 'NAV', 'DL', 'DT', 'DD', 'DETAILS', 'SUMMARY']);
  const sectionIds = new Set();
  const headingIds = new Map();
  for (const heading of template.content.querySelectorAll('h2[id]')) {
    if (sectionIdPattern.test(heading.id) && !sectionIds.has(heading.id)) {
      sectionIds.add(heading.id);
      headingIds.set(heading, heading.id);
    }
  }
  const assetUrls = new Map();
  const images = [];
  const asset = (reference, image) => {
    if (!reference?.startsWith('asset:')) return null;
    const name = reference.slice(6);
    if (!Object.hasOwn(payload.assets, name)) return null;
    const value = payload.assets[name];
    if (image ? !value.mime.startsWith('image/') : value.mime !== 'application/octet-stream') return null;
    return { name, ...value };
  };
  const assetUrl = value => {
    if (!assetUrls.has(value.id)) {
      const task = (async () => {
        const encrypted = await fetchEncrypted('/blog/2/blobs/' + value.id + '.bin', signal);
        const bytes = await openBytes(encrypted, key, value.id).catch(() => { throw new ArticleLoadError(); });
        try {
          if (current !== generation || signal.aborted) throw Error('Reader locked');
          const url = URL.createObjectURL(new Blob([bytes], { type: value.mime }));
          objectUrls.add(url);
          return url;
        } finally {
          bytes.fill(0);
        }
      })();
      assetUrls.set(value.id, task);
      task.catch(() => assetUrls.delete(value.id));
    }
    return assetUrls.get(value.id);
  };
  const copy = node => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
    if (!(node instanceof Element) || !allowed.has(node.tagName)) return document.createDocumentFragment();
    const element = document.createElement(node.tagName.toLowerCase());
    const classes = [...node.classList].filter(name => ['aside', 'dek', 'meta', 'eyebrow', 'gallery', 'gallery-paired', 'gallery-stack', 'gallery-crop', 'gallery-joined', 'gallery-slice', 'gallery-slice-top', 'gallery-slice-bottom', 'gallery-full', 'crop-top', 'route-pair', 'code-label', 'download-index', 'download-row', 'download-purpose', 'article-overview', 'overview-title', 'system-map', 'system-map-node', 'system-map-main', 'system-map-workers', 'system-map-branches', 'system-map-detail', 'system-map-uncertain'].includes(name));
    if (classes.length) element.className = classes.join(' ');
    if (headingIds.has(node)) element.id = headingIds.get(node);
    if (node.tagName === 'IMG') {
      const value = asset(node.getAttribute('src'), true);
      if (!value) return document.createDocumentFragment();
      element.alt = node.getAttribute('alt') || '';
      element.loading = 'lazy';
      element.decoding = 'async';
      images.push(assetUrl(value).then(url => { element.src = url; }));
    }
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      const attachment = asset(href, false);
      if (attachment) {
        element.href = '#';
        element.download = attachment.name;
        let busy = false;
        const message = document.createElement('span');
        message.className = 'asset-status';
        message.setAttribute('role', 'status');
        element.addEventListener('click', async event => {
          event.preventDefault();
          event.stopPropagation();
          if (busy || current !== generation) return;
          busy = true;
          element.setAttribute('aria-busy', 'true');
          message.textContent = '';
          try {
            const url = await assetUrl(attachment);
            if (current !== generation || signal.aborted) return;
            const download = document.createElement('a');
            download.href = url;
            download.download = attachment.name;
            download.hidden = true;
            document.body.append(download);
            download.click();
            download.remove();
          } catch {
            if (current === generation) {
              message.textContent = ' Download failed; try again.';
              element.after(message);
            }
          } finally {
            busy = false;
            element.removeAttribute('aria-busy');
          }
        });
      } else if (href.startsWith('#') && sectionIds.has(href.slice(1))) {
        element.setAttribute('href', href);
      } else if (/^https?:\/\//i.test(href)) {
        element.href = href;
        element.target = '_blank';
        element.rel = 'noopener noreferrer';
        element.referrerPolicy = 'no-referrer';
      }
    }
    for (const child of node.childNodes) element.append(copy(child));
    return element;
  };
  const fragment = document.createDocumentFragment();
  for (const node of template.content.childNodes) fragment.append(copy(node));
  await Promise.all(images);
  if (current === generation && !signal.aborted) addReadingTools(fragment, current);
  return fragment;
}

async function unlock(keyText, fromStorage = false) {
  const urlHash = location.hash;
  lock();
  const current = generation;
  button.disabled = true;
  status.textContent = 'Opening…';
  controller = new AbortController();
  const signal = controller.signal;
  try {
    const key = await importKey(keyText);
    const encrypted = await fetchEncrypted('/blog/2/payload.bin', signal);
    const payload = await openPost(encrypted, key);
    if (current !== generation) return;
    const fragment = await renderArticle(payload, key, signal, current);
    if (current !== generation) return;
    article.replaceChildren(fragment);
    locked.hidden = true;
    unlocked.hidden = false;
    status.textContent = '';
    activeKey = keyText;
    try { localStorage.setItem(storageKey, keyText); } catch { /* Keep the current view usable. */ }
    publishState();
    if (urlHash.startsWith('#key=') && location.hash === urlHash) {
      history.replaceState(history.state, '', location.pathname + location.search);
    }
    article.focus();
    if (sectionIdPattern.test(location.hash.slice(1))) {
      const heading = document.getElementById(location.hash.slice(1));
      if (heading && article.contains(heading)) {
        heading.scrollIntoView({ block: 'start' });
        heading.focus({ preventScroll: true });
      }
    }
  } catch (error) {
    if (current !== generation) return;
    if (fromStorage && !(error instanceof ArticleLoadError) && savedKey() === keyText) forgetKey();
    lock();
    status.textContent = error instanceof ArticleLoadError
      ? 'Could not load the article. Check your connection and try again.'
      : 'Could not open this article. Check the key and try again.';
    if (!(error instanceof ArticleLoadError)) input.setAttribute('aria-invalid', 'true');
    input.focus();
  } finally {
    if (current === generation) button.disabled = false;
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  void unlock(input.value.trim());
});

function unlockFromLink() {
  if (!location.hash.startsWith('#key=')) return false;
  const key = new URLSearchParams(location.hash.slice(1)).get('key');
  if (globalThis.crypto?.subtle) void unlock((key || '').trim());
  return true;
}

function restore() {
  if (unlockFromLink()) return;
  const key = savedKey();
  if (key && globalThis.crypto?.subtle) void unlock(key, true);
}

addEventListener('samey-article-lock', lockArticle);
addEventListener('samey-article-copy-link', async event => {
  const request = event.detail;
  const key = activeKey || savedKey();
  const current = generation;
  const report = success => {
    if (current === generation) dispatchEvent(new CustomEvent('samey-article-copy-result', { detail: { request, success } }));
  };
  if (!key) {
    report(false);
    return;
  }
  const url = new URL(location.href);
  url.hash = 'key=' + encodeURIComponent(key);
  try {
    await navigator.clipboard.writeText(url.href);
    report(true);
  } catch {
    report(false);
  }
});
addEventListener('pagehide', () => lock());
addEventListener('pageshow', event => { if (event.persisted) restore(); });
addEventListener('samey-pageleave', () => lock());
addEventListener('storage', event => {
  if ((event.key === storageKey || event.key === null) && !savedKey()) {
    if (location.hash.startsWith('#key=')) history.replaceState(history.state, '', location.pathname + location.search);
    lock();
  }
});
if (!globalThis.crypto?.subtle) {
  button.disabled = true;
  status.textContent = 'This browser cannot open the article. Try a current browser over HTTPS.';
}
publishState();
restore();
addEventListener('hashchange', unlockFromLink);
