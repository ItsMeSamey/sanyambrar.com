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

test('Reverb Range export commits valid drafts and blocks invalid drafts', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();

  await host.locator('#openRange').click();
  const start = host.getByRole('textbox', { name: 'Start time' });
  const exportButton = host.getByRole('button', { name: 'Export', exact: true });
  const toast = host.locator('#toast');

  await start.fill('1x:02.0');
  await page.keyboard.press('Enter');
  await expect(start).toHaveAttribute('aria-invalid', 'true');
  await expect(start).toBeFocused();

  await exportButton.click();
  await expect(start).toHaveAttribute('aria-invalid', 'true');
  await expect(start).toHaveText('1x:02.0');
  await expect(start).toBeFocused();
  await expect(toast).not.toHaveClass(/show/);
  await expect(toast).toHaveText('');

  await page.keyboard.press('Escape');
  await start.fill('5:00.0');
  await exportButton.click();
  await expect(start).toHaveText('5:00.0');
  await expect(start).not.toHaveAttribute('aria-invalid', 'true');
  await expect(toast).toHaveText('Exporting range');
  await expect(toast).toHaveClass(/show/);

  await page.waitForTimeout(1750);
  await expect(toast).not.toHaveClass(/show/);

  await start.fill('6:00.0');
  await exportButton.click();
  await expect(start).toHaveText('6:00.0');
  await expect(toast).toHaveClass(/show/);
});

test('Reverb Range Close discards draft state and preview playback', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();

  await host.locator('#openRange').click();
  const start = host.getByRole('textbox', { name: 'Start time' });
  const play = host.locator('#rangePlay');

  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
  await start.fill('bad');
  await page.keyboard.press('Enter');
  await expect(start).toHaveAttribute('aria-invalid', 'true');

  await host.locator('#rangeClose').click();
  await expect(host.locator('#homeScreen')).toHaveClass(/active/);
  await host.locator('#openRange').click();
  await expect(start).toHaveText('0:00.0');
  await expect(start).not.toHaveAttribute('aria-invalid', 'true');
  await expect(play).toHaveAttribute('aria-label', 'Play');
});
