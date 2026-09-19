import { test as base, expect } from '@playwright/test';

const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400) errors.push(response.status() + ' ' + response.url());
    });
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await use(page);
    expect(errors, 'Browser runtime and console errors').toEqual([]);
  },
});

async function visit(page, route, info) {
  const metadata = info.project.metadata;
  const port = metadata.development ? metadata.sitePort : metadata.port;
  await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle' });
}

const fullscreenState = page => page.evaluate(() => ({
  path: location.pathname,
  state: history.state,
  bodyOverflow: document.body.style.overflow,
  htmlOverflow: document.documentElement.style.overflow,
  fullscreen: document.querySelector('.reverb-demo-frame')?.classList.contains('is-fullscreen') ?? false,
  topbar: (() => {
    const topbar = document.querySelector('.site-topbar');
    return topbar instanceof HTMLElement
      ? { inert: topbar.inert, ariaHidden: topbar.getAttribute('aria-hidden') }
      : null;
  })(),
}));

test('Reverb fullscreen exit is single-flight and route history stays clean', async ({ page }, info) => {
  await visit(page, '/', info);
  await page.getByRole('link', { name: /Reverb/i }).first().click();
  await page.waitForURL('**/projects/reverb/');
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const frame = page.locator('.reverb-demo-frame');
  await expect(host).toBeVisible();

  const fullscreen = page.getByRole('button', { name: 'Fullscreen demo' });
  await fullscreen.click();
  await expect(frame).toHaveClass(/is-fullscreen/);

  await page.evaluate(() => {
    dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  });
  await expect(frame).not.toHaveClass(/is-fullscreen/);
  await expect.poll(() => new URL(page.url()).pathname).toBe('/projects/reverb/');
  await expect.poll(() => fullscreenState(page)).toMatchObject({
    path: '/projects/reverb/',
    state: { __sameyNavIndex: 1 },
    bodyOverflow: '',
    htmlOverflow: '',
    fullscreen: false,
    topbar: { inert: false, ariaHidden: null },
  });
  expect((await fullscreenState(page)).state.__sameyReverbFullscreen).toBeUndefined();

  await fullscreen.click();
  await expect(frame).toHaveClass(/is-fullscreen/);
  await page.goBack();
  await expect(frame).not.toHaveClass(/is-fullscreen/);
  await page.goForward();
  await expect(frame).toHaveClass(/is-fullscreen/);
  await expect.poll(() => fullscreenState(page)).toMatchObject({
    path: '/projects/reverb/',
    bodyOverflow: 'hidden',
    htmlOverflow: 'hidden',
    fullscreen: true,
    topbar: { inert: true, ariaHidden: 'true' },
  });

  await page.evaluate(() => {
    const exit = [...document.querySelectorAll('button')]
      .find(button => button.getAttribute('aria-label') === 'Exit fullscreen demo');
    exit?.click();
    exit?.click();
  });
  await expect(frame).not.toHaveClass(/is-fullscreen/);
  await expect.poll(() => new URL(page.url()).pathname).toBe('/projects/reverb/');
  expect((await fullscreenState(page)).state.__sameyReverbFullscreen).toBeUndefined();

  await fullscreen.click();
  await expect(frame).toHaveClass(/is-fullscreen/);
  await page.evaluate(async () => {
    if (!globalThis.SameyNavigate) throw new Error('SameyNavigate unavailable');
    await globalThis.SameyNavigate('/work/');
  });
  await page.waitForURL('**/work/');
  await expect(page.getByRole('heading', { name: 'Projects and demos' })).toBeVisible();
  await expect.poll(() => fullscreenState(page)).toMatchObject({
    path: '/work/',
    state: { __sameyNavIndex: 2 },
    bodyOverflow: '',
    htmlOverflow: '',
    fullscreen: false,
    topbar: { inert: false, ariaHidden: null },
  });
  expect((await fullscreenState(page)).state.__sameyReverbFullscreen).toBeUndefined();

  await page.goBack();
  await page.waitForURL('**/projects/reverb/');
  await expect(page.getByRole('group', { name: 'Interactive Reverb UI demo' })).toBeVisible();
  await expect(page.locator('.reverb-demo-frame')).not.toHaveClass(/is-fullscreen/);
  expect((await fullscreenState(page)).state.__sameyReverbFullscreen).toBeUndefined();
});
