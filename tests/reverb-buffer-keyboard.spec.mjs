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

async function visitReverb(page, info) {
  const metadata = info.project.metadata;
  const port = metadata.development ? metadata.sitePort : metadata.port;
  await page.goto(`http://127.0.0.1:${port}/projects/reverb/`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('group', { name: 'Interactive Reverb UI demo' })).toBeVisible();
}

test('Reverb buffer tabs use roving keyboard focus without switching capture', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const one = host.getByRole('tab', { name: 'One-shot' });
  const loop = host.getByRole('tab', { name: 'Looping' });
  const blob = host.locator('#blobControl');
  const exportFull = host.getByRole('button', { name: 'Export full' });

  await expect(one).toHaveAttribute('aria-selected', 'true');
  await expect(one).toHaveAttribute('tabindex', '0');
  await expect(loop).toHaveAttribute('aria-selected', 'false');
  await expect(loop).toHaveAttribute('tabindex', '-1');
  await expect(blob).toHaveAttribute('aria-label', 'Tap to pause capture');
  await expect(blob).toHaveClass(/live/);

  await one.focus();
  await page.keyboard.press('ArrowRight');
  await expect(loop).toBeFocused();
  await expect(loop).toHaveAttribute('aria-selected', 'true');
  await expect(loop).toHaveAttribute('tabindex', '0');
  await expect(one).toHaveAttribute('aria-selected', 'false');
  await expect(one).toHaveAttribute('tabindex', '-1');
  await expect(blob).toHaveAttribute('aria-label', 'Tap to start capture');
  await expect(blob).toHaveClass(/dimmed/);
  await expect(blob).not.toHaveClass(/live/);

  await page.keyboard.press('ArrowRight');
  await expect(one).toBeFocused();
  await expect(one).toHaveAttribute('aria-selected', 'true');
  await expect(blob).toHaveAttribute('aria-label', 'Tap to pause capture');
  await expect(blob).toHaveClass(/live/);

  await page.keyboard.press('ArrowLeft');
  await expect(loop).toBeFocused();
  await expect(loop).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('Home');
  await expect(one).toBeFocused();
  await expect(one).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('End');
  await expect(loop).toBeFocused();
  await expect(loop).toHaveAttribute('aria-selected', 'true');
  await expect(blob).toHaveClass(/dimmed/);

  await page.keyboard.press('Tab');
  await expect(exportFull).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(loop).toBeFocused();

  await one.click();
  await expect(one).toHaveAttribute('aria-selected', 'true');
  await expect(one).toHaveAttribute('tabindex', '0');
  await expect(loop).toHaveAttribute('tabindex', '-1');
  await expect(blob).toHaveAttribute('aria-label', 'Tap to pause capture');
  await expect(blob).toHaveClass(/live/);
});
