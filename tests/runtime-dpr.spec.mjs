import { test as base, expect } from '@playwright/test';

const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await use(page);
    expect(errors, 'Browser runtime and console errors').toEqual([]);
  },
});

async function visit(page, route, info) {
  await page.goto(`http://127.0.0.1:${info.project.metadata.port}${route}`, { waitUntil: 'networkidle' });
}

async function setDpr(page, context, dpr) {
  const cdp = await context.newCDPSession(page);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is unavailable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: dpr,
    mobile: false,
  });
  await expect.poll(() => page.evaluate(() => devicePixelRatio)).toBe(dpr);
}

async function backingState(locator) {
  return locator.evaluate(canvas => ({
    dpr: devicePixelRatio,
    width: canvas.width,
    height: canvas.height,
    clientWidth: canvas.clientWidth,
    clientHeight: canvas.clientHeight,
  }));
}

test('Keybr statistics canvases track live DPR changes', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'production-desktop', 'One production browser covers live DPR transitions');
  await page.addInitScript(() => localStorage.setItem('prefs.practice.tourSeen', 'true'));
  await visit(page, '/keybr', info);
  await page.getByRole('button', { name: 'Statistics', exact: true }).click();
  const canvases = page.locator('figure canvas');
  await expect(canvases).toHaveCount(6);
  const matchesDpr = () => canvases.evaluateAll(items => items.every(canvas =>
    canvas.width === Math.max(1, Math.round(canvas.clientWidth * devicePixelRatio))
      && canvas.height === Math.max(1, Math.round(canvas.clientHeight * devicePixelRatio))));
  await expect.poll(matchesDpr).toBe(true);
  await setDpr(page, context, 2);
  await expect.poll(matchesDpr, { message: 'Keybr canvas backing stores must follow a live DPR 1→2 transition' }).toBe(true);
  await setDpr(page, context, 3);
  await expect.poll(matchesDpr, { message: 'Keybr canvas backing stores must follow a live DPR 2→3 transition' }).toBe(true);
  await setDpr(page, context, 1);
  await expect.poll(matchesDpr, { message: 'Keybr canvas backing stores must follow a live DPR 3→1 transition' }).toBe(true);
});

test('Chain board canvas tracks live DPR changes', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'production-desktop', 'One production browser covers live DPR transitions');
  await visit(page, '/chain/', info);
  await page.getByRole('button', { name: 'Start classic', exact: true }).click();
  const canvas = page.getByRole('grid', { name: /Chain Reaction board/ });
  await expect(canvas).toBeVisible();
  const matches = () => canvas.evaluate(element => {
    const ratio = Math.min(devicePixelRatio || 1, 3);
    return element.width === Math.max(1, Math.round(element.clientWidth * ratio))
      && element.height === Math.max(1, Math.round(element.clientHeight * ratio));
  });
  await expect.poll(matches).toBe(true);
  await setDpr(page, context, 2);
  await expect.poll(matches, { message: 'Chain board backing store must follow a live DPR 1→2 transition' }).toBe(true);
  await setDpr(page, context, 3);
  await expect.poll(matches, { message: 'Chain board backing store must follow a live DPR 2→3 transition' }).toBe(true);
  await setDpr(page, context, 1);
  await expect.poll(matches, { message: 'Chain board backing store must follow a live DPR 3→1 transition' }).toBe(true);
});

test('Reverb blob canvas tracks live DPR changes', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'production-desktop', 'One production browser covers live DPR transitions');
  await visit(page, '/projects/reverb/', info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const canvas = host.locator('#blobCanvas');
  await expect(canvas).toBeVisible();
  const matches = () => canvas.evaluate(element => {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const rect = element.getBoundingClientRect();
    return element.width === Math.max(1, Math.round(rect.width * ratio))
      && element.height === Math.max(1, Math.round(rect.height * ratio));
  });
  await expect.poll(matches).toBe(true);
  await setDpr(page, context, 2);
  await expect.poll(matches, { message: 'Reverb blob backing store must follow a live DPR 1→2 transition' }).toBe(true);
  await setDpr(page, context, 3);
  await expect.poll(matches, { message: 'Reverb blob backing store must honor its DPR cap after a live 2→3 transition' }).toBe(true);
  await setDpr(page, context, 1);
  await expect.poll(matches, { message: 'Reverb blob backing store must follow a live DPR 3→1 transition' }).toBe(true);
});

test('Chain live logo canvas tracks live DPR changes', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'production-desktop', 'One production browser covers live DPR transitions');
  await visit(page, '/', info);
  const canvas = page.locator('.chain-live-mark canvas').first();
  await expect(canvas).toBeVisible();
  const matches = () => canvas.evaluate(element => {
    const ratio = Math.min(2, Math.max(1, devicePixelRatio || 1));
    const rect = element.getBoundingClientRect();
    return element.width === Math.max(1, Math.round(rect.width * ratio))
      && element.height === Math.max(1, Math.round(rect.height * ratio));
  });
  await expect.poll(matches).toBe(true);
  await setDpr(page, context, 2);
  await expect.poll(matches, { message: 'Chain logo backing store must follow a live DPR 1→2 transition' }).toBe(true);
  await setDpr(page, context, 3);
  await expect.poll(matches, { message: 'Chain logo backing store must honor its DPR cap after a live 2→3 transition' }).toBe(true);
  await setDpr(page, context, 1);
  await expect.poll(matches, { message: 'Chain logo backing store must follow a live DPR 3→1 transition' }).toBe(true);
});
