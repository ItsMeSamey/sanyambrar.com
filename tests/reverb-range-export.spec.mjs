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

async function openPausedRange(host) {
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('#openRange').click();
}

test('Reverb Range Export commits valid drafts and blocks invalid drafts', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  await openPausedRange(host);

  const start = host.getByRole('textbox', { name: 'Start time' });
  const exportButton = host.getByRole('button', { name: 'Export' });
  const toast = host.locator('#toast');
  const rangeScreen = host.locator('#rangeScreen');

  await start.fill('1x:02.0');
  await page.keyboard.press('Enter');
  await expect(start).toHaveAttribute('aria-invalid', 'true');
  await expect(start).toBeFocused();

  await exportButton.click();
  await expect(rangeScreen).toHaveClass(/active/);
  await expect(start).toBeFocused();
  await expect(start).toHaveText('1x:02.0');
  await expect(start).toHaveAttribute('aria-invalid', 'true');
  await expect(toast).not.toHaveClass(/show/);
  await expect(toast).not.toHaveText('Exporting range');

  await page.keyboard.press('Escape');
  await expect(start).toHaveText('0:00.0');
  await expect(start).not.toHaveAttribute('aria-invalid', 'true');

  await start.fill('5:00.0');
  await exportButton.click();
  await expect(rangeScreen).not.toHaveClass(/active/);
  await expect(host.locator('#homeScreen')).toHaveClass(/active/);
  await expect(host.locator('#brandButton')).toBeFocused();
  await expect(host.locator('#openRange')).toBeDisabled();
  await expect(host.locator('#rangeStart')).toHaveText('5:00.0');
  await expect(host.locator('#rangeStart')).not.toHaveAttribute('aria-invalid', 'true');
  await expect(toast).toHaveText('Exporting range');
  await expect(toast).toHaveClass(/show/);

  const startBoundary = host.locator('#rangeStartBoundary');
  await expect(startBoundary).toHaveAttribute('style', /left:/);
  const left = await startBoundary.evaluate(element => Number.parseFloat(element.style.left));
  expect(left).toBeGreaterThan(0);
});

test('Reverb Range Close discards text drafts and resets preview state', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  await openPausedRange(host);

  const start = host.getByRole('textbox', { name: 'Start time' });
  const close = host.locator('#rangeClose');
  const play = host.locator('#rangePlay');

  await start.fill('7:00.0');
  await close.click();
  await expect(host.locator('#homeScreen')).toHaveClass(/active/);

  await host.locator('#openRange').click();
  await expect(start).toHaveText('0:00.0');
  await expect(start).not.toHaveAttribute('aria-invalid', 'true');

  await start.fill('bad');
  await page.keyboard.press('Enter');
  await expect(start).toHaveAttribute('aria-invalid', 'true');
  await close.click();
  await host.locator('#openRange').click();
  await expect(start).toHaveText('0:00.0');
  await expect(start).not.toHaveAttribute('aria-invalid', 'true');

  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
  await close.click();
  await host.locator('#openRange').click();
  await expect(play).toHaveAttribute('aria-label', 'Play');
});

test('Reverb remembers successful Range selections per buffer', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  await openPausedRange(host);

  const start = host.locator('#rangeStart');
  const end = host.locator('#rangeEnd');
  const exportButton = host.locator('#rangeExport');
  const close = host.locator('#rangeClose');

  await start.fill('5:00.0');
  await page.keyboard.press('Enter');
  await end.fill('20:00.0');
  await exportButton.click();
  await expect(host.locator('#homeScreen')).toHaveClass(/active/);
  const openRange = host.locator('#openRange');
  await expect(openRange).toBeDisabled();
  await expect(host.getByRole('button', { name: 'Export full' })).toBeDisabled();
  await expect(host.getByRole('button', { name: 'Files' })).toBeDisabled();
  await expect(host.locator('#blobControl')).toBeDisabled();
  const loopSegment = host.locator('.buffer-segment[data-buffer="loop"]');
  await expect(loopSegment).toHaveAttribute('aria-disabled', 'true');
  await expect(host.locator('#brandButton')).toBeFocused();
  await loopSegment.click({ force: true });
  await expect(host.locator('.buffer-segment[data-buffer="one"]')).toHaveAttribute('aria-selected', 'true');

  await page.waitForTimeout(1300);
  await expect(openRange).toBeEnabled();
  await expect(host.locator('#blobControl')).toBeEnabled();
  await openRange.click();
  await expect(start).toHaveText('5:00.0');
  await expect(end).toHaveText('20:00.0');

  await close.click();
  await host.locator('.buffer-segment[data-buffer="loop"]').click();
  await host.locator('#openRange').click();
  await expect(start).not.toHaveText('5:00.0');
  await expect(end).not.toHaveText('20:00.0');

  await close.click();
  await host.locator('.buffer-segment[data-buffer="one"]').click();
  await host.locator('#openRange').click();
  await expect(start).toHaveText('5:00.0');
  await expect(end).toHaveText('20:00.0');
});
