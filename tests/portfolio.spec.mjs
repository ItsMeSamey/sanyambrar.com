import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const basePort = Number(process.env.PORTFOLIO_TEST_PORT ?? 4319);

const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const errors = [], warnings = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
      if (message.type() === 'warning' && message.text().includes('STRICT_')) warnings.push(message.text());
    });
    await use(page);
    if (warnings.length) await testInfo.attach('upstream-or-reactivity-warnings', { body: JSON.stringify([...new Set(warnings)], null, 2), contentType: 'application/json' });
    expect(errors, 'Browser runtime and console errors').toEqual([]);
  },
});

async function visit(page, route, info) {
  const port = info.project.metadata.development ? route.startsWith('/wordle') ? basePort + 2 : route.startsWith('/keybr') ? basePort + 3 : basePort + 1 : basePort;
  await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle' });
  await expect(page.locator('body')).not.toContainText(/Something's Gone Horridly Wrong|Oh no, something bad|This view failed to render|Editor failed to load/);
}

const routes = ['/', '/work/', '/projects/reverb/', '/projects/cnn/', '/tools/?tool=text', '/tools/?tool=base', '/tools/?tool=diff', '/tools/?tool=number', '/tools/?tool=markdown', '/blog/', '/blog/posts/btop-mutex.html', '/wordle.html', '/keybr.html', '/chain/'];
for (const route of routes) test(`renders ${route}`, async ({ page }, info) => {
  await visit(page, route, info);
  await expect(page.locator('body')).not.toHaveText('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal page overflow').toBe(true);
  expect(await page.title()).not.toBe('');
});

test('search, SPA navigation, history and theme', async ({ page }, info) => {
  await visit(page, '/', info);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByPlaceholder('Search games, tools, writing, work…').fill('CNN');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/projects\/cnn/);
  await expect(page.getByRole('heading', { name: 'CNN', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Games', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.locator('[data-theme-choice="dark"]').click();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toContain('dark');
  await page.keyboard.press('Escape');
});

test('Wordle typing, persistence, settings, reveal and statistics', async ({ page }, info) => {
  await visit(page, '/wordle.html', info);
  await page.getByRole('button', { name: 'Configure', exact: true }).click();
  await expect(page.locator('.wordle-board')).toBeVisible();
  await page.keyboard.type('planet');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => Object.entries(localStorage).filter(([key]) => key.startsWith('game.wordle.advanced.v2.')).map(([, value]) => JSON.parse(value).history[0][0]).join(''))).toBe('planet');
  const before = await page.locator('.wordle-board').textContent();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.wordle-board')).toHaveText(before);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const fast = page.getByRole('switch', { name: 'Fast Invalidate' });
  await expect(fast).toBeChecked();
  await fast.focus();
  await page.keyboard.press('Space');
  await expect(fast).not.toBeChecked();
  await page.getByRole('slider', { name: 'Max guesses', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('game.wordle.settings.hard')).maxTries)).toBe(7);
  await page.getByRole('button', { name: 'Reveal', exact: true }).click();
  await expect(page.getByText('The answer has been revealed.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close result', exact: true }).click();
  await page.getByRole('button', { name: 'Statistics', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Summary', exact: true })).toBeVisible();
  await expect(page.locator('.stats-summary-item').filter({ hasText: 'Games' }).first()).toContainText('1');
});

test('Wordle date picker and daily start', async ({ page }, info) => {
  await visit(page, '/wordle.html', info);
  await page.getByRole('button', { name: /^Choose date,/ }).click();
  await expect(page.getByRole('dialog', { name: 'Choose date' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Play', exact: true }).first().click();
  await expect(page.locator('.wordle-board')).toBeVisible();
  await expect(page).toHaveURL(/\?/);
});

test('Keybr settings persist and typing is live', async ({ page }, info) => {
  await visit(page, '/keybr.html', info);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const stop = page.getByRole('switch', { name: 'Stop cursor on error' });
  await expect(stop).toBeChecked();
  await stop.focus();
  await page.keyboard.press('Space');
  await expect(stop).not.toBeChecked();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('switch', { name: 'Stop cursor on error' })).not.toBeChecked();
  await page.locator('.keybr-view-back').click();
  await page.keyboard.press('Enter');
  await page.keyboard.type('learn ', { delay: 40 });
  await expect(page.locator('body')).not.toContainText(/Oh no, something bad/);
  await page.getByRole('button', { name: 'Statistics', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Statistics', exact: true })).toBeDisabled();
});

for (const route of ['/', '/wordle.html', '/tools/?tool=number']) test(`accessible ${route}`, async ({ page }, info) => {
  await visit(page, route, info);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
});

test('number conversion updates from edited input', async ({ page }, info) => {
  await visit(page, '/tools/?tool=number', info);
  await page.getByRole('textbox', { name: 'Input', exact: true }).fill('1024');
  await expect(page.getByRole('textbox', { name: 'Hexadecimal', exact: true })).toHaveValue('400');
  await page.getByRole('textbox', { name: 'Input', exact: true }).fill('FF');
  await page.getByRole('button', { name: 'Base 16', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Decimal', exact: true })).toHaveValue('255');
});

test('CNN intensity, drawing, inference and clear', async ({ page }, info) => {
  await visit(page, '/projects/cnn/', info);
  const canvas = page.locator('.cnn-pad');
  await page.getByRole('slider', { name: 'Drawing intensity' }).focus();
  await page.keyboard.press('Home');
  expect(await canvas.evaluate(element => element.getContext('2d').globalAlpha)).toBeCloseTo(0.1, 2);
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.8, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator('.cnn-prediction')).not.toHaveText('—');
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.locator('.cnn-prediction')).toHaveText('—');
  await expect(page.getByRole('button', { name: 'Clear', exact: true })).toBeDisabled();
});
