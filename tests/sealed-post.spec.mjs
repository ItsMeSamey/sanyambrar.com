import { test, expect } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { importKey, sealBytes } from '../src/site/public/blog/2/crypto.js';

const fixtureHtml = '<h1>Private fixture heading</h1><p>This text is only inside ciphertext.</p><img src="asset:pixel.png" alt="Fixture image"><a href="asset:example.user.js">Download fixture</a><script>globalThis.sealedInjected=true</script><img src="https://example.invalid/leak"><a href="javascript:alert(1)" onclick="alert(1)">Unsafe link</a>';

async function fixture(page, info, fromLink = false, html = fixtureHtml) {
  const rawKey = randomBytes(32);
  const keyText = rawKey.toString('base64url');
  const key = await importKey(keyText, ['encrypt']);
  const imageId = 'a'.repeat(64), scriptId = 'b'.repeat(64);
  const payload = { version: 2, html, assets: {
    'pixel.png': { mime: 'image/png', id: imageId },
    'example.user.js': { mime: 'application/octet-stream', id: scriptId },
  } };
  const envelope = await sealBytes(new TextEncoder().encode(JSON.stringify(payload)), key, 'post');
  const image = await sealBytes(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'), key, imageId);
  const script = await sealBytes(Buffer.from('fixture'), key, scriptId);
  await page.context().route('**/blog/2/blobs/*.bin', async route => {
    await route.fulfill({ contentType: 'application/octet-stream', body: Buffer.from(route.request().url().endsWith(scriptId + '.bin') ? script : image) });
  });
  const requests = [];
  let payloadRequests = 0;
  page.context().on('request', request => requests.push({ url: request.url(), body: request.postData() || '', headers: request.headers() }));
  await page.context().route('**/blog/2/payload.bin', async route => {
    payloadRequests++;
    await route.fulfill({ contentType: 'application/octet-stream', body: Buffer.from(envelope) });
  });
  const metadata = info.project.metadata;
  const port = metadata.development ? metadata.sitePort : metadata.port;
  await page.goto(`http://127.0.0.1:${port}/blog/2${fromLink ? '#key=' + keyText : ''}`, { waitUntil: 'networkidle' });
  const id = await page.locator('meta[name="article-id"]').getAttribute('content');
  return { keyText, requests, storageKey: 'samey.article.key.' + id, payloadRequests: () => payloadRequests };
}

async function unlock(page, keyText) {
  await page.getByLabel('Decryption key', { exact: true }).fill(keyText);
  await page.getByRole('button', { name: 'Unlock' }).click();
}

async function openAccess(page) {
  const trigger = page.locator('.site-topbar').getByRole('button', { name: 'Article access', exact: true });
  await trigger.focus();
  await trigger.click();
  return page.getByRole('dialog', { name: 'Article access', exact: true });
}

async function lockArticle(page) {
  const menu = await openAccess(page);
  await menu.getByRole('button', { name: 'Lock article', exact: true }).click();
}

test('serves the real encrypted article and assets intact without request mocks', async ({ request }, info) => {
  const metadata = info.project.metadata;
  const port = metadata.development ? metadata.sitePort : metadata.port;
  const source = new URL('../src/site/public/blog/2/', import.meta.url);
  const blobs = (await readdir(new URL('blobs/', source))).filter(name => name.endsWith('.bin'));
  expect(blobs.length).toBeGreaterThan(0);
  for (const path of ['payload.bin', ...blobs.map(name => 'blobs/' + name)]) {
    const response = await request.get(`http://127.0.0.1:${port}/blog/2/` + path);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/octet-stream');
    expect((await response.body()).equals(await readFile(new URL(path, source)))).toBe(true);
  }
});

test('locked page reveals nothing; wrong keys fail; correct key stays local', async ({ page }, info) => {
  const state = await fixture(page, info);
  await expect(page.locator('#article')).toBeEmpty();
  expect(state.payloadRequests()).toBe(0);
  await unlock(page, 'not-a-key');
  await expect(page.getByRole('status')).toContainText('Could not open');
  expect(state.payloadRequests()).toBe(0);
  await unlock(page, randomBytes(32).toString('base64url'));
  await expect(page.getByRole('status')).toContainText('Could not open');
  await expect(page.locator('#article')).toBeEmpty();
  await unlock(page, state.keyText);
  await expect(page.getByRole('heading', { name: 'Private fixture heading' })).toBeVisible();
  await expect(page.getByLabel('Decryption key', { exact: true })).toHaveValue('');
  expect(await page.title()).toBe('Private writing · Sanyam Brar');
  expect(await page.evaluate(key => localStorage.getItem(key), state.storageKey)).toBe(state.keyText);
  expect(state.requests.some(request => JSON.stringify(request).includes(state.keyText))).toBe(false);
  expect(await page.evaluate(key => JSON.stringify({ session: { ...sessionStorage }, history: history.state }).includes(key), state.keyText)).toBe(false);
  expect(state.requests.some(request => request.url.includes('example.invalid'))).toBe(false);
  expect(await page.evaluate(() => globalThis.sealedInjected)).toBeUndefined();
  await expect(page.getByText('Unsafe link', { exact: true })).not.toHaveAttribute('href');
  expect(state.requests.some(request => request.url.endsWith('b'.repeat(64) + '.bin'))).toBe(false);
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download fixture' }).click();
  const downloaded = await download;
  expect(downloaded.suggestedFilename()).toBe('example.user.js');
  expect(await readFile(await downloaded.path(), 'utf8')).toBe('fixture');
  await lockArticle(page);
  await expect(page.locator('#article')).toBeEmpty();
  await expect(page.getByLabel('Decryption key', { exact: true })).toBeFocused();
});

test('reading tools copy exact code, navigate without URL changes and disappear on lock', async ({ page }, info) => {
  await page.addInitScript(() => {
    globalThis.copiedSamples = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async text => {
        if (globalThis.copyShouldFail) throw Error('Clipboard unavailable');
        globalThis.copiedSamples.push(text);
      },
    } });
  });
  const code = 'const sample = "<example>";\n  console.log(sample);\n';
  const html = '<h1>Private fixture heading</h1><h2>First section</h2><pre><code>const sample = "&lt;example&gt;";\n  console.log(sample);\n</code></pre><h2>Second section</h2><dl class="download-index"><div class="download-row"><dt><a href="asset:example.user.js">Download fixture</a><span class="download-purpose">Fixture purpose</span></dt><dd>Fixture description</dd></div></dl>';
  const state = await fixture(page, info, false, html);
  await unlock(page, state.keyText);
  const navigation = page.getByRole('navigation', { name: 'Article sections' });
  await expect(navigation.getByRole('link')).toHaveCount(2);
  expect(await page.evaluate(() => globalThis.copiedSamples)).toEqual([]);
  const before = page.url();
  await navigation.getByRole('link', { name: 'Second section' }).click();
  await expect(page.getByRole('heading', { name: 'Second section' })).toBeFocused();
  expect(page.url()).toBe(before);
  const copyButton = page.getByRole('button', { name: 'Copy code' });
  await expect(copyButton.locator('svg')).toHaveCount(1);
  await copyButton.click();
  await expect(page.locator('.copy-status')).toHaveText('Copied');
  expect(await page.evaluate(() => globalThis.copiedSamples)).toEqual([code]);
  await page.evaluate(() => { globalThis.copyShouldFail = true; });
  await copyButton.click();
  await expect(page.locator('.copy-status')).toContainText('Select the code');
  await expect(copyButton).toBeEnabled();
  await expect(page.locator('#article pre')).toHaveAttribute('tabindex', '0');
  for (const width of [1440, 700, 390, 240, 180]) {
    await page.setViewportSize({ width, height: 420 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(await page.locator('.article-sections a, .code-tools, .download-row dt, .download-row dd').evaluateAll(nodes => nodes.every(node => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.left >= -1 && rect.right <= innerWidth + 1;
    }))).toBe(true);
  }
  await page.emulateMedia({ forcedColors: 'active' });
  await page.locator('#article pre').focus();
  await page.keyboard.press('Shift+Tab');
  await expect(copyButton).toBeFocused();
  expect(await copyButton.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
  await lockArticle(page);
  await expect(page.locator('#article')).toBeEmpty();
  await expect(navigation).toHaveCount(0);
  await expect(copyButton).toHaveCount(0);
});

test('encrypted article overview is sanitized, enhanced once and remains usable at narrow widths', async ({ page }, info) => {
  const entries = Array.from({ length: 5 }, (_, index) => {
    const number = index + 1;
    return `<li><a href="#article-section-${number}"><strong>Section ${number}</strong><span>Generic finding ${number}</span></a></li>`;
  }).join('');
  const headings = Array.from({ length: 5 }, (_, index) => {
    const number = index + 1;
    return `<h2 id="article-section-${number}">Section ${number}</h2><p>Generic body ${number}</p>`;
  }).join('');
  const html = '<h1>Generic fixture heading</h1>'
    + '<nav class="article-overview"><p class="overview-title">Fixture overview</p><ul>' + entries + '</ul></nav>'
    + '<p><a class="invalid-fragment" href="#article-section-99">Missing target</a>'
    + '<a class="unsafe-fragment" href="#other-target">Other target</a></p>'
    + headings
    + '<h2 id="other-target">Heading with rejected identity</h2>'
    + '<p id="article-section-6">Element with rejected identity</p>';
  const state = await fixture(page, info, false, html);

  await expect(page.locator('#article')).toBeEmpty();
  await expect(page.getByText('Generic finding 1', { exact: true })).toHaveCount(0);
  await unlock(page, state.keyText);

  const overview = page.locator('nav.article-overview');
  await expect(overview).toHaveCount(1);
  await expect(overview).toHaveAttribute('aria-label', 'Article sections');
  await expect(page.locator('.article-sections')).toHaveCount(0);
  await expect(overview.locator(':scope > p.overview-title')).toHaveText('Fixture overview');
  await expect(overview.locator(':scope > ul > li')).toHaveCount(5);
  await expect(overview.locator('li > a > strong')).toHaveCount(5);
  await expect(overview.locator('li > a > span')).toHaveCount(5);

  const links = overview.locator('li > a');
  for (let index = 0; index < 5; index++) {
    const href = '#article-section-' + (index + 1);
    await expect(links.nth(index)).toHaveAttribute('href', href);
    await expect(page.locator('h2' + href)).toHaveCount(1);
    await expect(page.locator('h2' + href)).toHaveAttribute('tabindex', '-1');
  }
  await expect(page.getByText('Missing target', { exact: true })).not.toHaveAttribute('href');
  await expect(page.getByText('Other target', { exact: true })).not.toHaveAttribute('href');
  await expect(page.getByRole('heading', { name: 'Heading with rejected identity' })).not.toHaveAttribute('id', 'other-target');
  await expect(page.getByText('Element with rejected identity', { exact: true })).not.toHaveAttribute('id');

  const initialUrl = page.url();
  await links.nth(0).click();
  await expect(page.locator('#article-section-1')).toBeFocused();
  expect(page.url()).toBe(initialUrl);
  await links.nth(1).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#article-section-2')).toBeFocused();
  expect(page.url()).toBe(initialUrl);
  expect(await links.nth(2).evaluate(link => link.dispatchEvent(new MouseEvent('click', {
    bubbles: true, cancelable: true, ctrlKey: true,
  })))).toBe(true);

  for (const width of [1440, 700, 390, 180]) {
    await page.setViewportSize({ width, height: 520 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(await overview.locator('p, li, a, strong, span').evaluateAll(nodes => nodes.every(node => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.left >= -1 && rect.right <= innerWidth + 1;
    }))).toBe(true);
  }

  await page.setViewportSize({ width: 700, height: 520 });
  await page.evaluate(() => history.replaceState(history.state, '', '#article-section-4'));
  await page.reload({ waitUntil: 'networkidle' });
  expect(new URL(page.url()).hash).toBe('#article-section-4');
  await expect(page.locator('#article-section-4')).toBeFocused();
  expect(await page.locator('#article-section-4').evaluate(node => {
    const rect = node.getBoundingClientRect();
    return rect.top >= 0 && rect.top < innerHeight;
  })).toBe(true);
  await expect(page.locator('nav.article-overview')).toHaveCount(1);

  await page.emulateMedia({ forcedColors: 'active' });
  await links.nth(3).focus();
  expect(await links.nth(3).evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');

  await lockArticle(page);
  await expect(page.locator('#article')).toBeEmpty();
  await expect(page.getByText('Generic finding 1', { exact: true })).toHaveCount(0);
  await expect(overview).toHaveCount(0);
});

test('collapsed code disclosures hide both scrollbar overlays and restore scrolling on reopen', async ({ page }, info) => {
  const code = ('const example = "' + 'x'.repeat(160) + '";\n').repeat(60);
  const html = '<h1>Disclosure fixture</h1><details><summary>Example helper</summary><pre><code>' + code + '</code></pre></details><p>Following text</p>';
  const state = await fixture(page, info, false, html);
  await unlock(page, state.keyText);
  const details = page.locator('#article details');
  const summary = details.locator('summary');
  const pre = details.locator('pre');
  const innerBars = () => page.locator('.samey-vscroll, .samey-hscroll').evaluateAll(bars => bars.filter(bar => {
    const rect = bar.getBoundingClientRect();
    return !bar.hidden && rect.width > 0 && rect.height > 0
      && (bar.classList.contains('samey-hscroll') || Math.abs(rect.left - (innerWidth - 7)) > 1);
  }).length);
  await expect(summary).toBeVisible();
  await expect.poll(innerBars).toBe(0);
  for (const width of [1280, 390, 180]) {
    await page.setViewportSize({ width, height: 1400 });
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(details).toHaveAttribute('open', '');
    await expect(pre).toBeVisible();
    await expect.poll(innerBars).toBe(2);
    await pre.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => pre.evaluate(node => node.scrollTop > 0 && node.scrollLeft > 0)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await summary.focus();
    await page.keyboard.press('Space');
    await expect(details).not.toHaveAttribute('open');
    await expect(pre).not.toBeVisible();
    await expect.poll(innerBars).toBe(0);
    await expect(summary).toBeFocused();
  }
});

test('private code uses the mutex article typography, borders and syntax colors', async ({ page }, info) => {
  const html = '<h1>Private code</h1><p>Inline <code>sample</code></p><pre><code>// A comment\nconst sample = new Array(42);\nconsole.log("&lt;img src=x onerror=alert(1)&gt;");\n</code></pre>';
  const state = await fixture(page, info, false, html);
  await unlock(page, state.keyText);
  await expect(page.locator('#article pre code')).toHaveAttribute('data-highlighted', 'javascript');
  await expect(page.locator('#article pre img')).toHaveCount(0);
  expect(await page.locator('#article pre').textContent()).toBe('// A comment\nconst sample = new Array(42);\nconsole.log("<img src=x onerror=alert(1)>");\n');
  const reference = await page.context().newPage();
  await reference.goto(new URL('/blog/1', page.url()).href, { waitUntil: 'networkidle' });
  await expect(reference.locator('pre code').first()).toHaveAttribute('data-highlighted', 'cpp');
  const properties = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'backgroundColor', 'padding', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderRadius', 'tabSize', 'whiteSpace'];
  const styles = (target, selector) => target.locator(selector).first().evaluate((node, properties) => {
    const css = getComputedStyle(node);
    return Object.fromEntries(properties.map(property => [property, css[property]]));
  }, properties);
  for (const theme of ['light', 'dark']) {
    for (const target of [page, reference]) {
      await target.getByRole('button', { name: 'Appearance', exact: true }).click();
      await target.locator('[data-theme-choice="' + theme + '"]').click();
      await target.keyboard.press('Escape');
    }
    for (const selector of ['main pre', 'main pre code', 'main p code', '.syn-keyword', '.syn-type', '.syn-number', '.syn-string', '.syn-comment', '.syn-function']) {
      expect(await styles(page, selector), selector + ' in ' + theme).toEqual(await styles(reference, selector));
    }
  }
  await reference.close();
});

test('reload and back-forward restore the saved key until explicitly locked', async ({ page }, info) => {
  const state = await fixture(page, info);
  await unlock(page, state.keyText);
  await expect(page.locator('#article')).toContainText('Private fixture heading');
  expect(await page.evaluate(key => localStorage.getItem(key), state.storageKey)).toBe(state.keyText);
  await page.evaluate(() => dispatchEvent(new Event('samey-pageleave')));
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await expect(page.locator('#article')).toBeEmpty();
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(page.locator('#article')).toContainText('Private fixture heading');
  await expect(page.locator('.site-topbar')).toHaveCount(1);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('#article')).toContainText('Private fixture heading');
  await lockArticle(page);
  expect(await page.evaluate(key => localStorage.getItem(key), state.storageKey)).toBeNull();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('#article')).toBeEmpty();
  await expect(page.getByLabel('Decryption key', { exact: true })).toHaveValue('');
});

test('in-flight unlock cannot restore content after page leave', async ({ page }, info) => {
  const state = await fixture(page, info);
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  await page.route('**/blog/2/payload.bin', async route => {
    await waiting;
    await route.fallback();
  });
  const request = page.waitForRequest('**/blog/2/payload.bin');
  await unlock(page, state.keyText);
  await request;
  await page.evaluate(() => dispatchEvent(new Event('samey-pageleave')));
  release();
  await expect(page.locator('#article')).toBeEmpty();
  await expect(page.getByRole('heading', { name: '[REDACTED]' })).toBeVisible();
});

test('lock form and decrypted article fit narrow viewports', async ({ page }, info) => {
  const state = await fixture(page, info);
  for (const width of [390, 240, 180]) {
    await page.setViewportSize({ width, height: 420 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.getByRole('button', { name: 'Unlock' })).toBeVisible();
  }
  await unlock(page, state.keyText);
  await expect(page.getByRole('heading', { name: 'Private fixture heading' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('Writing exposes literal redaction and opens a standalone reader', async ({ page }, info) => {
  const metadata = info.project.metadata;
  const port = metadata.development ? metadata.sitePort : metadata.port;
  await page.goto(`http://127.0.0.1:${port}/blog/`, { waitUntil: 'networkidle' });
  const entry = page.locator('a.compact-row[href="/blog/2"]');
  await expect(entry.locator('.compact-name')).toHaveText('[REDACTED]');
  await expect(entry.locator('.compact-note')).toHaveText('[REDACTED]');
  await entry.click();
  await expect(page).toHaveURL(/\/blog\/2\/?$/);
  await expect(page.getByRole('heading', { name: '[REDACTED]' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-static-article', '');
  await expect(page.locator('#article')).toBeEmpty();
});

test('damaged image ciphertext keeps the article locked', async ({ page }, info) => {
  const state = await fixture(page, info);
  await page.route('**/blog/2/blobs/*.bin', route => route.fulfill({ body: 'damaged', contentType: 'application/octet-stream' }));
  await unlock(page, state.keyText);
  await expect(page.getByRole('status')).toContainText('Could not load');
  await expect(page.locator('#article')).toBeEmpty();
});

test('URL keys are saved by UUID, disappear from the URL, and stay out of requests', async ({ page }, info) => {
  const state = await fixture(page, info, true);
  await expect(page.locator('#article')).toContainText('Private fixture heading');
  expect(state.payloadRequests()).toBe(1);
  expect(new URL(page.url()).hash).toBe('');
  expect(state.requests.some(request => JSON.stringify(request).includes(state.keyText))).toBe(false);
  expect(await page.evaluate(key => JSON.stringify({ session: { ...sessionStorage }, history: history.state }).includes(key), state.keyText)).toBe(false);
  expect(await page.evaluate(key => localStorage.getItem(key), state.storageKey)).toBe(state.keyText);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('#article')).toContainText('Private fixture heading');
  expect(state.payloadRequests()).toBe(2);
  await page.evaluate(() => { location.hash = 'key=invalid'; });
  await expect(page.getByRole('status')).toContainText('Could not open');
  expect(new URL(page.url()).hash).toBe('#key=invalid');
  await page.evaluate(key => { location.hash = 'key=' + key; }, state.keyText);
  await expect(page.locator('#article')).toContainText('Private fixture heading');
  expect(new URL(page.url()).hash).toBe('');
  expect(state.requests.some(request => JSON.stringify(request).includes(state.keyText))).toBe(false);
});

test('URL key stays while opening and on failure, and clears after a successful retry', async ({ page }, info) => {
  const state = await fixture(page, info);
  const wrongKey = randomBytes(32).toString('base64url');
  await page.evaluate(key => { location.hash = 'key=' + key; }, wrongKey);
  await expect(page.getByRole('status')).toContainText('Could not open');
  expect(new URL(page.url()).hash).toBe('#key=' + wrongKey);
  await expect(page.locator('#article')).toBeEmpty();

  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  await page.route('**/blog/2/payload.bin', async route => {
    await waiting;
    await route.fallback();
  });
  const request = page.waitForRequest('**/blog/2/payload.bin');
  await page.evaluate(key => { location.hash = 'key=' + key; }, state.keyText);
  await request;
  expect(new URL(page.url()).hash).toBe('#key=' + state.keyText);
  await expect(page.locator('#article')).toBeEmpty();
  release();
  await expect(page.locator('#article')).toContainText('Private fixture heading');
  expect(new URL(page.url()).hash).toBe('');

  await lockArticle(page);
  await page.route('**/blog/2/payload.bin', route => route.fulfill({ status: 503, body: '' }));
  await page.evaluate(key => { location.hash = 'key=' + key; }, state.keyText);
  await expect(page.getByRole('status')).toContainText('Could not load');
  await expect(page.getByLabel('Decryption key', { exact: true })).not.toHaveAttribute('aria-invalid', 'true');
  expect(new URL(page.url()).hash).toBe('#key=' + state.keyText);
  expect(state.requests.some(request => JSON.stringify(request).includes(state.keyText))).toBe(false);
});

test('missing files and unreachable servers report loading errors without blaming the key', async ({ page }, info) => {
  const state = await fixture(page, info);
  await page.route('**/blog/2/payload.bin', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<html>Fallback page</html>' }));
  await unlock(page, state.keyText);
  await expect(page.getByRole('status')).toContainText('Could not load');
  await expect(page.getByLabel('Decryption key', { exact: true })).not.toHaveAttribute('aria-invalid', 'true');
  await page.route('**/blog/2/payload.bin', route => route.abort('connectionrefused'));
  await unlock(page, state.keyText);
  await expect(page.getByRole('status')).toContainText('Could not load');
  await expect(page.getByLabel('Decryption key', { exact: true })).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#article')).toBeEmpty();
});

test('padlock menu copies a keyed URL and explicit locking reaches other tabs', async ({ page }, info) => {
  await page.addInitScript(() => {
    globalThis.copiedLinks = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async text => {
        if (globalThis.copyShouldFail) throw Error('Clipboard unavailable');
        globalThis.copiedLinks.push(text);
      },
    } });
  });
  const state = await fixture(page, info);
  const trigger = page.locator('.site-topbar').getByRole('button', { name: 'Article access', exact: true });
  await expect(trigger).toHaveText('');
  await expect(trigger.locator('svg.lucide-lock')).toBeVisible();
  await expect(page.locator('main #lock, main .reading-tools')).toHaveCount(0);
  let menu = await openAccess(page);
  await expect(menu.getByRole('button', { name: 'Copy URL with key' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await unlock(page, state.keyText);
  await expect(trigger.locator('svg.lucide-lock-open')).toBeVisible();
  menu = await openAccess(page);
  const originalUrl = page.url();
  const pagesBefore = page.context().pages().length;
  await page.evaluate(() => { globalThis.copyShouldFail = true; });
  await menu.getByRole('button', { name: 'Copy URL with key' }).click();
  await expect(menu.getByRole('button', { name: 'Copy failed. Try again' })).toBeEnabled();
  expect(await page.evaluate(() => globalThis.copiedLinks)).toEqual([]);
  await page.evaluate(() => { globalThis.copyShouldFail = false; });
  await menu.getByRole('button', { name: 'Copy failed. Try again' }).click();
  await expect(menu.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
  expect(page.context().pages().length).toBe(pagesBefore);
  expect(page.url()).toBe(originalUrl);
  const copied = await page.evaluate(() => globalThis.copiedLinks);
  expect(copied).toEqual([originalUrl + '#key=' + state.keyText]);
  await page.keyboard.press('Escape');
  const popup = await page.context().newPage();
  await popup.goto(copied[0], { waitUntil: 'networkidle' });
  await expect(popup.locator('#article')).toContainText('Private fixture heading');
  expect(new URL(popup.url()).pathname).toBe('/blog/2');
  expect(new URL(popup.url()).hash).toBe('');
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  expect(state.requests.some(request => JSON.stringify(request).includes(state.keyText))).toBe(false);
  await lockArticle(page);
  await expect(page.locator('#article')).toBeEmpty();
  await expect(popup.locator('#article')).toBeEmpty();
  expect(await page.evaluate(key => localStorage.getItem(key), state.storageKey)).toBeNull();
  await popup.reload({ waitUntil: 'networkidle' });
  await expect(popup.locator('#article')).toBeEmpty();
  await popup.close();
});

test('pending link copies survive menu reopening and ignore results after locking', async ({ page }, info) => {
  await page.addInitScript(() => {
    globalThis.pendingCopies = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: () => new Promise((resolve, reject) => {
        globalThis.pendingCopies.push({ resolve, reject });
      }),
    } });
  });
  const state = await fixture(page, info);
  await unlock(page, state.keyText);
  await expect(page.locator('#article')).toContainText('Private fixture heading');
  let menu = await openAccess(page);
  await menu.getByRole('button', { name: 'Copy URL with key' }).click();
  await expect(menu.getByRole('button', { name: 'Copying', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  menu = await openAccess(page);
  await expect(menu.getByRole('button', { name: 'Copying', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => globalThis.pendingCopies.length)).toBe(1);
  await page.evaluate(() => { globalThis.pendingCopies[0].reject(Error('Clipboard unavailable')); });
  await menu.getByRole('button', { name: 'Copy failed. Try again' }).click();
  await expect(menu.getByRole('button', { name: 'Copying', exact: true })).toBeDisabled();
  await menu.getByRole('button', { name: 'Lock article', exact: true }).click();
  await expect(page.locator('#article')).toBeEmpty();
  menu = await openAccess(page);
  await expect(menu.getByRole('button', { name: 'Copy URL with key' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await unlock(page, state.keyText);
  await expect(page.locator('#article')).toContainText('Private fixture heading');
  menu = await openAccess(page);
  await menu.getByRole('button', { name: 'Copy URL with key' }).click();
  expect(await page.evaluate(() => globalThis.pendingCopies.length)).toBe(3);
  await page.evaluate(() => { globalThis.pendingCopies[1].resolve(); });
  await expect(menu.getByRole('button', { name: 'Copying', exact: true })).toBeDisabled();
  await page.evaluate(() => { globalThis.pendingCopies[2].resolve(); });
  await expect(menu.getByRole('button', { name: 'Copied', exact: true })).toBeEnabled();
  await page.keyboard.press('Escape');
  menu = await openAccess(page);
  await expect(menu.getByRole('button', { name: 'Copy URL with key' })).toBeEnabled();
});

test('saved keys belong to UUIDs rather than the route, and locking only clears this article', async ({ page }, info) => {
  const state = await fixture(page, info);
  await unlock(page, state.keyText);
  await expect(page.locator('#article')).toContainText('Private fixture heading');
  const secondId = randomUUID();
  const secondStorageKey = 'samey.article.key.' + secondId;
  await page.route('**/blog/2', async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace(/(<meta name="article-id" content=")[^"]+/, '$1' + secondId);
    await route.fulfill({ response, body: html });
  });
  const requestsBefore = state.payloadRequests();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('#article')).toBeEmpty();
  expect(state.payloadRequests()).toBe(requestsBefore);
  await unlock(page, state.keyText);
  await expect(page.locator('#article')).toContainText('Private fixture heading');
  expect(await page.evaluate(key => localStorage.getItem(key), secondStorageKey)).toBe(state.keyText);
  await lockArticle(page);
  expect(await page.evaluate(key => localStorage.getItem(key), secondStorageKey)).toBeNull();
  expect(await page.evaluate(key => localStorage.getItem(key), state.storageKey)).toBe(state.keyText);
  await page.unroute('**/blog/2');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('#article')).toContainText('Private fixture heading');
});

test('stale saved keys are discarded while temporary loading errors retain valid keys', async ({ page }, info) => {
  const state = await fixture(page, info);
  await page.evaluate(key => localStorage.setItem(key, 'not-a-key'), state.storageKey);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('#unlock-status')).toContainText('Could not open');
  expect(await page.evaluate(key => localStorage.getItem(key), state.storageKey)).toBeNull();
  await unlock(page, state.keyText);
  await expect(page.locator('#article')).toContainText('Private fixture heading');
  await page.route('**/blog/2/payload.bin', route => route.fulfill({ status: 503, body: '' }));
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('#unlock-status')).toContainText('Could not load');
  expect(await page.evaluate(key => localStorage.getItem(key), state.storageKey)).toBe(state.keyText);
  await page.unroute('**/blog/2/payload.bin');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('#article')).toContainText('Private fixture heading');
});

test('article access menu stays inside narrow and short screens and supports keyboard dismissal', async ({ page }, info) => {
  const state = await fixture(page, info);
  await unlock(page, state.keyText);
  await expect(page.locator('#article')).toContainText('Private fixture heading');
  for (const [width, height] of [[1440,1000],[390,420],[240,240],[180,180],[800,160]]) {
    await page.setViewportSize({ width, height });
    const menu = await openAccess(page);
    await expect(menu).toBeVisible();
    await expect.poll(() => menu.evaluate(node => {
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight;
    })).toBe(true);
    expect(await menu.locator('button').evaluateAll(nodes => nodes.every(node => {
      const box = node.getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth;
    }))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
  }
  await page.emulateMedia({ forcedColors: 'active' });
  const menu = await openAccess(page);
  await page.keyboard.press('Tab');
  const first = menu.getByRole('button', { name: 'Copy URL with key' });
  await expect(first).toBeFocused();
  expect(await first.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
});

test('old article links redirect to numbered routes and retain keyed fragments until decryption', async ({ page }, info) => {
  const state = await fixture(page, info);
  const origin = new URL(page.url()).origin;
  await page.goto(origin + '/blog/sealed/#key=' + state.keyText, { waitUntil: 'networkidle' });
  await expect(page.locator('#article')).toContainText('Private fixture heading');
  await expect(page).toHaveURL(origin + '/blog/2');
  await page.goto(origin + '/blog/posts/btop-mutex', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(origin + '/blog/1');
  await expect(page.getByRole('heading', { name: "btop's broken lock", exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Article access', exact: true })).toHaveCount(0);
});

test('reader uses the shared icon controls before and after unlocking', async ({ page }, info) => {
  const state = await fixture(page, info);
  const bar = page.locator('.site-topbar');
  await expect(bar.getByRole('link', { name: 'Writing', exact: true })).toBeVisible();
  const appearance = bar.getByRole('button', { name: 'Appearance', exact: true });
  await expect(appearance.locator('svg')).toBeVisible();
  await expect(appearance).toHaveText('');
  await appearance.click();
  await expect(page.locator('.samey-theme-panel')).toBeVisible();
  await page.locator('[data-theme-choice="dark"]').click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.keyboard.press('Escape');
  await unlock(page, state.keyText);
  await expect(page.locator('#article')).toContainText('Private fixture heading');
  await expect(bar).toHaveCount(1);
  await bar.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Search', exact: true })).toBeVisible();
});
