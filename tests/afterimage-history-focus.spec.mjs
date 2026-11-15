import { test, expect } from '@playwright/test';

test('history transfer returns focus to its opener after Escape and Close', async ({ page }, info) => {
  test.skip(info.project.metadata.development, 'Afterimage has its own development entry.');
  await page.goto(`http://127.0.0.1:${info.project.metadata.port}/afterimage/`, { waitUntil: 'networkidle' });
  const opener = page.getByRole('button', { name: 'Import or export history', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Keep your history', exact: true });
  const close = page.getByRole('button', { name: 'Close history transfer', exact: true });

  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveClass(/(?:^|\s)samey-dialog(?:\s|$)/);
  await expect(dialog).toHaveClass(/(?:^|\s)ai-transfer(?:\s|$)/);
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Export history', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await close.click();
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test('history transfer has an opaque centered surface within narrow and short viewports', async ({ page }, info) => {
  test.skip(info.project.metadata.development, 'Afterimage has its own development entry.');
  await page.goto(`http://127.0.0.1:${info.project.metadata.port}/afterimage/`, { waitUntil: 'networkidle' });
  const opener = page.getByRole('button', { name: 'Import or export history', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Keep your history', exact: true });
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS('opacity', '1');

  for (const viewport of [{ width: 320, height: 640 }, { width: 320, height: 280 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    const surface = await dialog.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, background: style.backgroundColor, overflowY: style.overflowY };
    });
    expect(surface.x).toBeGreaterThanOrEqual(13);
    expect(surface.y).toBeGreaterThanOrEqual(13);
    expect(surface.x + surface.width).toBeLessThanOrEqual(viewport.width - 13);
    expect(surface.y + surface.height).toBeLessThanOrEqual(viewport.height - 13);
    expect(Math.abs(surface.x + surface.width / 2 - viewport.width / 2)).toBeLessThan(1);
    expect(Math.abs(surface.y + surface.height / 2 - viewport.height / 2)).toBeLessThan(1);
    expect(surface.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(surface.background).not.toBe('transparent');
    expect(surface.overflowY).toBe('auto');
  }
});
