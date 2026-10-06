import { test, expect } from '@playwright/test';

async function visit(page, route, info) {
  const meta = info.project.metadata;
  const port = meta.development ? (route === '/wordle' ? meta.wordlePort : meta.sitePort) : meta.port;
  await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle' });
}

async function expectHitTarget(target) {
  await expect.poll(() => target.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2));
  }), { message: 'The newest control must receive pointer input, not just be visible in the DOM' }).toBe(true);
}

test('right-clicking an open context menu preserves its modal owner and keyboard focus', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('game.wordle.advanced.5.6.0.0', JSON.stringify({
    config: { mode: 'advanced', wordLength: 5, maxTries: 6, disabledLetters: 0, allowAny: false },
    history: [['apple', 'rrrrr'], ['', '']],
  })));
  await visit(page, '/wordle', info);
  await page.getByRole('button', { name: 'Configure', exact: true }).click();
  const settings = page.getByRole('button', { name: 'Settings', exact: true });
  await settings.click();
  await page.getByRole('button', { name: 'Active Games', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Active games', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.click({ button: 'right', position: { x: 10, y: 10 } });
  const menu = page.getByRole('menu', { name: 'Context menu' });
  const firstItem = menu.locator('[role="menuitem"]:not(:disabled)').first();
  await expect(firstItem).toBeFocused();

  // Reopening on the menu itself must keep the original dialog's focus scope.
  for (let attempt = 0; attempt < 2; attempt++) {
    await firstItem.click({ button: 'right' });
    await expect(menu).toBeVisible();
    await expectHitTarget(firstItem);
    await expect(firstItem).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(menu.locator('[role="menuitem"]:not(:disabled)').nth(1)).toBeFocused();
    await expect(dialog).toBeVisible();
  }

  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(settings).toBeFocused();
});

test('closing search dismisses its child context menu and leaves both reusable', async ({ page }, info) => {
  await visit(page, '/', info);
  const search = page.getByRole('dialog', { name: 'Search', exact: true });
  const input = page.getByPlaceholder('Search games, tools, writing, work…');
  const menu = page.getByRole('menu', { name: 'Context menu' });

  for (let attempt = 0; attempt < 2; attempt++) {
    await page.keyboard.press('Control+k');
    await expect(search).toBeVisible();
    await expect(input).toBeFocused();
    await expectHitTarget(input);
    await input.fill('work');
    await page.keyboard.press('Shift+F10');
    await expect(menu).toBeVisible();
    const firstItem = menu.locator('[role="menuitem"]:not(:disabled)').first();
    await expect(firstItem).toBeFocused();
    await expectHitTarget(firstItem);

    // The search shortcut dismisses the owner while its child menu is focused.
    await page.keyboard.press('Control+k');
    await expect(search).not.toBeVisible();
    await expect(menu).not.toBeVisible();
  }

  const appearance = page.getByRole('button', { name: 'Appearance', exact: true });
  await appearance.click();
  const panel = page.locator('.samey-theme-panel');
  const dark = panel.locator('[data-theme-choice="dark"]');
  await expect(dark).toBeVisible();
  await dark.focus();
  await page.keyboard.press('Shift+F10');
  await expect(menu).toBeVisible();
  await expectHitTarget(menu.locator('[role="menuitem"]:not(:disabled)').first());
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(panel).toBeVisible();
  await expect(dark).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).not.toBeVisible();
  await expect(appearance).toBeFocused();
});

test('history navigation clears open search and context layers without breaking their next use', async ({ page }, info) => {
  await visit(page, '/', info);
  const documentStart = await page.evaluate(() => performance.timeOrigin);
  const workLoaded = page.evaluate(() => new Promise(resolve => addEventListener('samey-pageload', () => resolve(true), { once: true })));
  await page.locator('a[href="/work/"]').first().click();
  await expect(page).toHaveURL(/\/work\/?$/);
  await workLoaded;
  await page.keyboard.press('Control+k');
  const search = page.getByRole('dialog', { name: 'Search', exact: true });
  const input = page.getByPlaceholder('Search games, tools, writing, work…');
  await expect(input).toBeFocused();
  await page.keyboard.press('Shift+F10');
  const menu = page.getByRole('menu', { name: 'Context menu' });
  await expect(menu).toBeVisible();
  await expectHitTarget(menu.locator('[role="menuitem"]:not(:disabled)').first());

  const homeLoaded = page.evaluate(() => new Promise(resolve => addEventListener('samey-pageload', () => resolve(true), { once: true })));
  await page.goBack();
  await homeLoaded;
  await expect(page.getByRole('heading', { name: 'Games', exact: true })).toBeVisible();
  expect(await page.evaluate(() => performance.timeOrigin), 'This must exercise cleanup in the same document').toBe(documentStart);
  await expect(search).not.toBeVisible();
  await expect(menu).not.toBeVisible();

  await page.keyboard.press('Control+k');
  await expect(search).toBeVisible();
  await expect(input).toBeFocused();
  await expectHitTarget(input);
  await input.fill('work');
  await page.keyboard.press('Shift+F10');
  await expect(menu).toBeVisible();
  await expectHitTarget(menu.locator('[role="menuitem"]:not(:disabled)').first());
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('work');
  await page.keyboard.press('Escape');
  await expect(search).not.toBeVisible();
});
