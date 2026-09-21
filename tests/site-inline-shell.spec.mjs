import { test, expect } from '@playwright/test';

const customTheme = {
  color: 'custom',
  cursorMode: 'native',
  custom: {
    tone: 'dark',
    background: '#101820',
    text: '#f2f7f9',
    accent: '#ff2d88',
    error: '#ff5a5f',
    warning: '#ffd166',
    slow: '#ff5a5f',
    fast: '#06d6a0',
    effort: '#7b61ff',
    blurTint: '#000000',
    shadowTint: '#000000',
  },
};

const productionUrl = (info, path) => `http://127.0.0.1:${info.project.metadata.port}${path}`;
const productionOnly = info => test.skip(info.project.metadata.development, 'generated production HTML owns the embedding contract');

const htmlPaths = [
  '/',
  '/work/',
  '/tools/',
  '/chain/',
  '/blog/',
  '/projects/zhtml/',
  '/projects/oneserial/',
  '/projects/reverb/',
  '/projects/cnn/',
  '/keybr',
  '/wordle',
  '/blog/posts/btop-mutex',
];

const startupPaths = ['/', '/projects/zhtml/', '/projects/reverb/', '/keybr', '/wordle'];

const externalStylesheet = /<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["'][^"']+["'])[^>]*>/i;
const externalModulePreload = /<link\b(?=[^>]*\brel=["']modulepreload["'])(?=[^>]*\bhref=["'][^"']+["'])[^>]*>/i;
const externalScript = /<script\b(?=[^>]*\bsrc=["'][^"']+["'])[^>]*>/i;

test('generated HTML embeds every page-load stylesheet and script', async ({ request }, info) => {
  productionOnly(info);
  for (const path of htmlPaths) {
    const response = await request.get(productionUrl(info, path));
    expect(response.ok(), `${path} should load`).toBe(true);
    const html = await response.text();
    expect(html, `${path} external stylesheet`).not.toMatch(externalStylesheet);
    expect(html, `${path} external modulepreload`).not.toMatch(externalModulePreload);
    expect(html, `${path} external script`).not.toMatch(externalScript);
    const bootstrap = html.indexOf('data-samey-theme-bootstrap');
    const sharedShell = html.indexOf('data-samey-inline-shell');
    expect(bootstrap, `${path} early theme bootstrap`).toBeGreaterThanOrEqual(0);
    if (sharedShell >= 0) expect(bootstrap, `${path} bootstrap order`).toBeLessThan(sharedShell);
  }
});

test('saved custom colors own first paint with zero startup JS or CSS requests', async ({ page }, info) => {
  productionOnly(info);
  await page.addInitScript(value => localStorage.setItem('keybr.theme', JSON.stringify(value)), customTheme);
  const runtimeErrors = [];
  const startupAssets = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin === new URL(productionUrl(info, '/')).origin && /\.(?:js|css)$/.test(url.pathname)) startupAssets.push(url.pathname);
  });

  for (const path of startupPaths) {
    startupAssets.length = 0;
    await page.goto(productionUrl(info, path), { waitUntil: 'commit' });
    const first = await page.evaluate(() => ({
      theme: document.documentElement.dataset.siteTheme || '',
      background: getComputedStyle(document.documentElement).backgroundColor,
      siteBackground: document.documentElement.style.getPropertyValue('--site-bg'),
    }));
    expect(first, `${path} must be themed before body/runtime settlement`).toEqual({
      theme: 'custom',
      background: 'rgb(16, 24, 32)',
      siteBackground: '#101820',
    });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(100);
    await expect(page.locator('body')).not.toContainText(/This view failed to render|Something's Gone Horridly Wrong|Oh no, something bad/);
    expect([...new Set(startupAssets)], `${path} startup JS/CSS requests`).toEqual([]);
  }
  expect(runtimeErrors).toEqual([]);
});

test('Solid navigation never drops the painted theme or performs a document navigation', async ({ page }, info) => {
  productionOnly(info);
  await page.addInitScript(value => localStorage.setItem('keybr.theme', JSON.stringify(value)), customTheme);
  const documentRequests = [];
  const runtimeErrors = [];
  page.on('request', request => { if (request.isNavigationRequest()) documentRequests.push(new URL(request.url()).pathname); });
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });

  await page.goto(productionUrl(info, '/'), { waitUntil: 'networkidle' });
  documentRequests.length = 0;
  const work = page.locator('a[href="/work/"]').first();
  await work.hover();
  await page.waitForTimeout(80);
  await work.click();

  const samples = await page.evaluate(async () => {
    const values = [];
    for (let index = 0; index < 28; index++) {
      await new Promise(requestAnimationFrame);
      values.push({
        path: location.pathname,
        background: getComputedStyle(document.documentElement).backgroundColor,
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        siteBackground: document.documentElement.style.getPropertyValue('--site-bg'),
        routes: document.querySelectorAll('.site-route').length,
      });
    }
    return values;
  });

  await expect(page).toHaveURL(/\/work\/$/);
  expect(documentRequests, 'SPA route click must not reload the document').toEqual([]);
  expect(samples.length).toBeGreaterThan(0);
  for (const sample of samples) {
    expect(sample.background).toBe('rgb(16, 24, 32)');
    expect(sample.bodyBackground).toBe('rgb(16, 24, 32)');
    expect(sample.siteBackground).toBe('#101820');
    expect(sample.routes).toBe(1);
  }
  expect(runtimeErrors).toEqual([]);
});
