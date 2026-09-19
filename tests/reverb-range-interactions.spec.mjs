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

const parseRangeTime = value => {
  const parts = value.trim().split(':');
  const seconds = Number(parts.at(-1));
  const minutes = parts.length >= 2 ? Number(parts.at(-2)) : 0;
  const hours = parts.length === 3 ? Number(parts[0]) : 0;
  return hours * 3600 + minutes * 60 + seconds;
};

test('Reverb Range editor exposes editable boundaries and duration controls', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();

  await host.locator('#openRange').click();
  const start = host.getByRole('textbox', { name: 'Start time' });
  const end = host.getByRole('textbox', { name: 'End time' });
  const wheel = host.getByRole('spinbutton', { name: 'Range duration' });
  const wavebox = host.locator('.range-timeline .wavebox');

  await expect(start).toHaveAttribute('contenteditable', 'plaintext-only');
  await expect(end).toHaveAttribute('contenteditable', 'plaintext-only');
  await expect(start).toHaveText('0:00.0');
  const totalText = (await end.textContent())?.trim() ?? '';
  const totalSeconds = parseRangeTime(totalText);
  expect(totalSeconds).toBeGreaterThan(20 * 60);
  await expect(wheel).toHaveAttribute('aria-valuetext', / 1x$/);
  expect(Number(await wheel.getAttribute('aria-valuenow'))).toBeCloseTo(totalSeconds, 1);

  await start.fill('5:00.0');
  await page.keyboard.press('Enter');
  await expect(start).toHaveText('5:00.0');
  expect(Number(await wheel.getAttribute('aria-valuenow'))).toBeCloseTo(totalSeconds - 300, 1);
  await expect(host.locator('#rangeStartBoundary')).toHaveAttribute('style', /left:/);

  await end.fill('20:00.0');
  await page.keyboard.press('Enter');
  await expect(end).toHaveText('20:00.0');
  await expect(wheel).toHaveAttribute('aria-valuenow', '900');
  await expect(wheel).toHaveAttribute('aria-valuetext', '0:15:00 1x');

  await wheel.focus();
  await page.keyboard.press('ArrowUp');
  await expect(end).toHaveText('20:01.0');
  await expect(wheel).toHaveAttribute('aria-valuenow', '901');
  await page.keyboard.press('PageDown');
  await expect(end).toHaveText('19:01.0');
  await expect(wheel).toHaveAttribute('aria-valuenow', '841');

  const wheelBox = await wheel.boundingBox();
  if (!wheelBox) throw new Error('Range duration wheel has no geometry');
  await page.mouse.click(
    wheelBox.x + wheelBox.width * 0.92,
    wheelBox.y + wheelBox.height * 0.84,
  );
  await expect(wheel).toHaveAttribute('aria-valuetext', / 5x$/);
  const beforeFiveStep = Number(await wheel.getAttribute('aria-valuenow'));
  await wheel.focus();
  await page.keyboard.press('ArrowUp');
  expect(Number(await wheel.getAttribute('aria-valuenow'))).toBeCloseTo(beforeFiveStep + 5, 1);

  await start.focus();
  const waveBox = await wavebox.boundingBox();
  if (!waveBox) throw new Error('Range waveform has no geometry');
  await page.mouse.move(waveBox.x + waveBox.width * 0.25, waveBox.y + waveBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(waveBox.x + waveBox.width * 0.4, waveBox.y + waveBox.height / 2);
  await page.mouse.up();
  await expect(host.locator('#rangeStartBoundary')).toHaveAttribute('style', /40%/);
  const scrubbedStart = (await start.textContent())?.trim() ?? '';
  expect(parseRangeTime(scrubbedStart)).toBeCloseTo(totalSeconds * 0.4, 0);

  const scrubbedEnd = (await end.textContent())?.trim() ?? '';
  await host.locator('#rangeSettings').click();
  await host.locator('#settingsNav').click();
  await expect(start).toHaveText(scrubbedStart);
  await expect(end).toHaveText(scrubbedEnd);

  await host.locator('#rangeIncidents').click();
  await host.locator('#incidentsBack').click();
  await expect(start).toHaveText(scrubbedStart);
  await expect(end).toHaveText(scrubbedEnd);

  await start.fill('1x:02.0');
  await page.keyboard.press('Enter');
  await expect(start).toHaveAttribute('aria-invalid', 'true');
  await expect(start).toBeFocused();
  await end.focus();
  await expect(start).toBeFocused();
  await expect(start).toHaveText('1x:02.0');
  await expect(start).toHaveAttribute('aria-invalid', 'true');

  await page.keyboard.press('Escape');
  await expect(start).not.toHaveAttribute('aria-invalid', 'true');
  await expect(start).toHaveText(scrubbedStart);
});

test('Reverb Range initial surface stays visually stable while controls become semantic', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('#openRange').click();

  const start = host.getByRole('textbox', { name: 'Start time' });
  const end = host.getByRole('textbox', { name: 'End time' });
  const wheel = host.getByRole('spinbutton', { name: 'Range duration' });
  await expect(start).toHaveCSS('width', '100px');
  await expect(start).toHaveCSS('height', '34px');
  await expect(end).toHaveCSS('width', '100px');
  await expect(end).toHaveCSS('height', '34px');
  await expect(wheel).toHaveCSS('height', '160px');
  await expect(wheel).toHaveCSS('touch-action', 'none');
  await expect(host.locator('#rangeStartBoundary')).toHaveClass(/active/);
  await expect(host.locator('#rangeEndBoundary')).not.toHaveClass(/active/);
});

test('Reverb Range duration wheel owns pointer edits through settle', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('#openRange').click();

  const start = host.getByRole('textbox', { name: 'Start time' });
  const wheel = host.getByRole('spinbutton', { name: 'Range duration' });
  const play = host.locator('#rangePlay');
  const exportButton = host.locator('#rangeExport');

  await start.fill('5:00.0');
  await page.keyboard.press('Enter');
  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Pause');

  await start.fill('7:00.0');
  await expect(start).toBeFocused();

  const box = await wheel.boundingBox();
  if (!box) throw new Error('Range duration wheel has no geometry');
  const x = box.x + box.width * 0.68;
  const y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();

  await expect(wheel).toBeFocused();
  await expect(start).toHaveText('5:00.0');
  await expect(start).not.toHaveAttribute('aria-invalid', 'true');
  await expect(play).toHaveAttribute('aria-label', 'Play');
  await expect(play).toBeDisabled();
  await expect(exportButton).toBeDisabled();

  await page.mouse.move(x, y - box.height * (42 / 160), { steps: 4 });
  await page.mouse.up();
  await expect(exportButton).toBeDisabled();

  await page.waitForTimeout(180);
  await expect(exportButton).toBeEnabled();
  await expect(play).toBeEnabled();
  await expect(start).toHaveText('4:59.0');
});

test('Reverb Range duration wheel drops a delayed commit after target handoff', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('#openRange').click();

  const start = host.getByRole('textbox', { name: 'Start time' });
  const end = host.getByRole('textbox', { name: 'End time' });
  const wheel = host.getByRole('spinbutton', { name: 'Range duration' });
  const exportButton = host.locator('#rangeExport');

  await start.fill('5:00.0');
  await page.keyboard.press('Enter');
  await end.fill('20:00.0');
  await page.keyboard.press('Enter');
  await start.focus();

  const box = await wheel.boundingBox();
  if (!box) throw new Error('Range duration wheel has no geometry');
  const x = box.x + box.width * 0.68;
  const y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - box.height * (42 / 160), { steps: 4 });
  await page.mouse.up();
  await expect(exportButton).toBeDisabled();

  await end.focus();
  await expect(end).toBeFocused();
  await page.waitForTimeout(180);

  await expect(exportButton).toBeEnabled();
  await expect(start).toHaveText('5:00.0');
  await expect(end).toHaveText('20:00.0');
});

test('Reverb Range duration wheel releases ownership on window blur', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('#openRange').click();

  const start = host.getByRole('textbox', { name: 'Start time' });
  const wheel = host.getByRole('spinbutton', { name: 'Range duration' });
  const exportButton = host.locator('#rangeExport');
  const play = host.locator('#rangePlay');

  await start.fill('5:00.0');
  await page.keyboard.press('Enter');

  const box = await wheel.boundingBox();
  if (!box) throw new Error('Range duration wheel has no geometry');
  const x = box.x + box.width * 0.68;
  const y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - box.height * (42 / 160), { steps: 4 });
  await expect(exportButton).toBeDisabled();

  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(exportButton).toBeEnabled();
  await expect(play).toBeEnabled();
  await page.mouse.up();
  await page.waitForTimeout(180);

  await expect(start).toHaveText('5:00.0');
  await expect(exportButton).toBeEnabled();
});

test('Reverb Range wheel scrolling invalidates text drafts and preview', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('#openRange').click();

  const start = host.getByRole('textbox', { name: 'Start time' });
  const wheel = host.getByRole('spinbutton', { name: 'Range duration' });
  const play = host.locator('#rangePlay');

  await start.fill('5:00.0');
  await page.keyboard.press('Enter');
  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
  await start.fill('7:00.0');

  const box = await wheel.boundingBox();
  if (!box) throw new Error('Range duration wheel has no geometry');
  await page.mouse.move(box.x + box.width * 0.92, box.y + box.height * 0.5);
  await page.mouse.wheel(0, 120);

  await expect(start).toHaveText('5:00.0');
  await expect(start).not.toBeFocused();
  await expect(play).toHaveAttribute('aria-label', 'Play');
  await expect(wheel).toHaveAttribute('aria-valuetext', / 5x$/);
});
