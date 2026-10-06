import { test, expect } from '@playwright/test';

async function visit(page, route, info) {
  const meta = info.project.metadata;
  const port = meta.development ? (route === '/wordle' ? meta.wordlePort : meta.sitePort) : meta.port;
  await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle' });
}

async function expectOnTop(surface) {
  await expect.poll(() => surface.evaluate(node => {
    const r = node.getBoundingClientRect();
    return node.contains(document.elementFromPoint(r.left + Math.min(12, r.width / 2), r.top + Math.min(12, r.height / 2)));
  })).toBe(true);
}

test('right-click menu opens above a native popover and Escape closes only the newest surface', async ({ page }, info) => {
  await visit(page, '/blog/2', info);
  const access = page.getByRole('button', { name: 'Article access', exact: true });
  const underlying = page.getByRole('dialog', { name: 'Article access', exact: true });
  const menu = page.getByRole('menu', { name: 'Context menu' });
  for (const [width, height] of [[1440,1000],[390,844],[180,180],[800,160]]) {
    await page.setViewportSize({ width, height });
    await access.focus();
    await access.click();
    await expect(underlying).toBeVisible();
    await underlying.click({ button: 'right', position: { x: 3, y: 3 } });
    await expect(menu).toBeVisible();
    await expectOnTop(menu);
    await expect(underlying).toBeVisible();
    expect(await menu.evaluate(node => {
      const r = node.getBoundingClientRect();
      return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
    })).toBe(true);
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
    await expect(underlying).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(underlying).not.toBeVisible();
  }
});

test('opening search after the context menu puts search above it, then restores the previous surface', async ({ page }, info) => {
  await visit(page, '/', info);
  await page.mouse.click(30, 100, { button: 'right' });
  const menu = page.getByRole('menu', { name: 'Context menu' });
  await expect(menu).toBeVisible();
  await expectOnTop(menu);
  await page.keyboard.press('Control+k');
  const search = page.locator('.site-search');
  await expect(search).toBeVisible();
  await expect(menu).toBeVisible();
  expect(await menu.evaluate(node => {
    const r = node.getBoundingClientRect();
    return !!document.elementFromPoint(r.left + 12, r.top + 12)?.closest('.site-search');
  })).toBe(true);
  await page.keyboard.press('Escape');
  await expect(search).not.toBeVisible();
  await expect(menu).toBeVisible();
  await expectOnTop(menu);
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();

  await page.keyboard.press('Control+k');
  const input = search.locator('input');
  await input.click({ button: 'right' });
  await expect(menu).toBeVisible();
  await expectOnTop(menu);
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(search).toBeVisible();
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(search).not.toBeVisible();
});

test('context menu stays interactive inside a modal dialog without dismissing it', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('game.wordle.advanced.5.6.0.0', JSON.stringify({
    config: { mode: 'advanced', wordLength: 5, maxTries: 6, disabledLetters: 0, allowAny: false },
    history: [['apple', 'rrrrr'], ['', '']],
  })));
  await visit(page, '/wordle', info);
  await page.getByRole('button', { name: 'Configure', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Active Games', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Active games', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.click({ button: 'right', position: { x: 10, y: 10 } });
  const menu = page.getByRole('menu', { name: 'Context menu' });
  await expect(menu).toBeVisible();
  await expectOnTop(menu);
  await expect(menu.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  expect(await menu.evaluate(node => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Control+k');
  const search = page.getByRole('dialog', { name: 'Search', exact: true });
  await expect(search).toBeVisible();
  const input = search.locator('input');
  await input.click();
  await expect(input).toBeFocused();
  await expect(dialog).toBeVisible();
  await page.keyboard.type('work');
  await expect(input).toHaveValue('work');
  await page.keyboard.press('Escape');
  await expect(search).not.toBeVisible();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused();
});
