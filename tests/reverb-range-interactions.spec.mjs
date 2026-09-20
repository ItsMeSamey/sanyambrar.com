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

test('Reverb Range waveform scrub discards drafts and pauses then resumes preview', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('#openRange').click();

  const start = host.getByRole('textbox', { name: 'Start time' });
  const play = host.locator('#rangePlay');
  const wavebox = host.locator('.range-timeline .wavebox');

  await start.fill('5:00.0');
  await page.keyboard.press('Enter');
  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
  await start.fill('7:00.0');

  const box = await wavebox.boundingBox();
  if (!box) throw new Error('Range waveform has no geometry');
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.3, y);
  await page.mouse.down();

  await expect(start).not.toBeFocused();
  await expect(start).not.toHaveText('7:00.0');
  await expect(play).toHaveAttribute('aria-label', 'Play');

  await page.mouse.move(box.x + box.width * 0.35, y, { steps: 3 });
  await page.mouse.up();
  await expect(play).toHaveAttribute('aria-label', 'Play');
  expect(parseRangeTime((await start.textContent()) ?? '')).toBeGreaterThan(500);

  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
  await page.mouse.move(box.x + box.width * 0.4, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.45, y, { steps: 3 });
  await page.mouse.up();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
});

test('Reverb Range boundary handles honor drag slop and preview ownership', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('#openRange').click();

  const start = host.getByRole('textbox', { name: 'Start time' });
  const play = host.locator('#rangePlay');
  const boundary = host.locator('#rangeStartBoundary');

  await start.fill('5:00.0');
  await page.keyboard.press('Enter');
  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
  const beforeClick = (await start.textContent()) ?? '';

  let box = await boundary.boundingBox();
  if (!box) throw new Error('Range start boundary has no geometry');
  let x = box.x + box.width / 2 + 15;
  let y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 3, y, { steps: 2 });
  await page.mouse.up();

  await expect(start).toHaveText(beforeClick);
  await expect(play).toHaveAttribute('aria-label', 'Play');

  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
  const beforeDrag = parseRangeTime((await start.textContent()) ?? '');
  box = await boundary.boundingBox();
  if (!box) throw new Error('Range start boundary has no geometry');
  x = box.x + box.width / 2;
  y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 30, y, { steps: 4 });
  await expect(play).toHaveAttribute('aria-label', 'Play');
  await page.mouse.up();

  await expect(play).toHaveAttribute('aria-label', 'Pause');
  expect(parseRangeTime((await start.textContent()) ?? '')).toBeGreaterThan(beforeDrag + 20);
});

test('Reverb Range text focus pauses preview before boundary editing', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('#openRange').click();

  const end = host.getByRole('textbox', { name: 'End time' });
  const play = host.locator('#rangePlay');
  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
  await end.focus();
  await expect(end).toBeFocused();
  await expect(play).toHaveAttribute('aria-label', 'Play');
});

test('Reverb Range duration wheel renders native neighbor rings', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('#openRange').click();

  const start = host.getByRole('textbox', { name: 'Start time' });
  const end = host.getByRole('textbox', { name: 'End time' });
  const wheel = host.getByRole('spinbutton', { name: 'Range duration' });

  await start.fill('5:00.0');
  await page.keyboard.press('Enter');
  await end.fill('20:00.0');
  await page.keyboard.press('Enter');

  const numberFaces = wheel.locator('.wheel-face:not(.wheel-profile)');
  await expect.poll(() => numberFaces.evaluateAll(nodes =>
    nodes.slice(5, 10).map(node => node.textContent?.trim()),
  )).toEqual(['13', '14', '15', '16', '17']);

  const box = await wheel.boundingBox();
  if (!box) throw new Error('Range duration wheel has no geometry');
  await page.mouse.click(box.x + box.width * 0.92, box.y + box.height * 0.84);
  await expect(wheel).toHaveAttribute('aria-valuetext', / 5x$/);
  await expect.poll(() => numberFaces.evaluateAll(nodes =>
    nodes.slice(5, 10).map(node => node.textContent?.trim()),
  )).toEqual(['05', '10', '15', '20', '25']);
  await expect.poll(() => wheel.locator('.wheel-profile').allTextContents())
    .toEqual(['15x', '1x', '5x', '15x', '1x']);
});

test('Reverb Range enforces the native WAV export duration cap', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('.buffer-segment[data-buffer="loop"]').click();
  await host.locator('#openRange').click();

  const start = host.getByRole('textbox', { name: 'Start time' });
  const end = host.getByRole('textbox', { name: 'End time' });
  const wheel = host.getByRole('spinbutton', { name: 'Range duration' });
  const exportButton = host.locator('#rangeExport');
  const timelineTotal = (await host.locator('#rangeDurationLabel').textContent())?.trim();
  if (!timelineTotal) throw new Error('Range timeline total is unavailable');

  const defaultWavCapSeconds = 4_294_967_258 / 88_200;
  expect(Number(await wheel.getAttribute('aria-valuemax'))).toBeCloseTo(defaultWavCapSeconds, 3);

  await start.fill('0:00.0');
  await page.keyboard.press('Enter');
  await end.fill(timelineTotal);
  await page.keyboard.press('Enter');
  expect(Number(await wheel.getAttribute('aria-valuenow'))).toBeGreaterThan(defaultWavCapSeconds);
  await expect(exportButton).toBeDisabled();

  await start.fill('40:00:00.0');
  await page.keyboard.press('Enter');
  await expect(exportButton).toBeEnabled();
});

test('Reverb Range export cap follows applied audio settings', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('.buffer-segment[data-buffer="loop"]').click();
  await host.locator('#openRange').click();

  const wheel = host.getByRole('spinbutton', { name: 'Range duration' });
  const defaultCap = Number(await wheel.getAttribute('aria-valuemax'));
  const expectedMonoCap = 4_294_967_258 / 88_200;
  expect(defaultCap).toBeCloseTo(expectedMonoCap, 3);

  await host.locator('#rangeSettings').click();
  const channels = host.locator('.settings-card.dropdown').first();
  await channels.click();
  await host.getByRole('menuitemradio', { name: 'Stereo' }).click();
  await expect(channels.locator('.value')).toHaveText('Stereo');
  await host.locator('#settingsDone').click();
  await expect(host.locator('#rangeScreen')).toHaveClass(/active/);

  const stereoCap = Number(await wheel.getAttribute('aria-valuemax'));
  const expectedStereoCap = 4_294_967_256 / 176_400;
  expect(stereoCap).toBeCloseTo(expectedStereoCap, 3);
  expect(stereoCap).toBeCloseTo(defaultCap / 2, 3);

  await host.locator('#rangeSettings').click();
  const settingsCards = host.locator('.settings-card.dropdown');
  await settingsCards.first().click();
  await host.getByRole('menuitemradio', { name: 'Mono' }).click();
  await settingsCards.nth(1).click();
  await host.getByRole('menuitemradio', { name: '8-bit integer' }).click();
  await host.locator('#settingsDone').click();
  await expect(host.locator('#rangeScreen')).toHaveClass(/active/);

  const mono8Cap = Number(await wheel.getAttribute('aria-valuemax'));
  const expectedMono8Cap = 4_294_967_258 / 44_100;
  expect(mono8Cap).toBeCloseTo(expectedMono8Cap, 6);
});

test('Reverb Range wheel marks only native over-limit components', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('.buffer-segment[data-buffer="loop"]').click();
  await host.locator('#openRange').click();

  const start = host.getByRole('textbox', { name: 'Start time' });
  const end = host.getByRole('textbox', { name: 'End time' });
  const wheel = host.getByRole('spinbutton', { name: 'Range duration' });
  await start.fill('0:00.0');
  await page.keyboard.press('Enter');
  await end.fill('13:40:00.0');
  await page.keyboard.press('Enter');

  const currentFaces = wheel.locator('.wheel-face.current:not(.wheel-profile)');
  await expect(currentFaces.nth(0)).not.toHaveClass(/over-limit/);
  await expect(currentFaces.nth(1)).toHaveClass(/over-limit/);
  await expect(currentFaces.nth(2)).toHaveClass(/over-limit/);

  const numberFaces = wheel.locator('.wheel-face:not(.wheel-profile)');
  await expect(numberFaces.nth(6)).not.toHaveClass(/over-limit/);
  await expect(numberFaces.nth(10)).toHaveClass(/over-limit/);
  const colons = wheel.locator('.wheel-colon');
  await expect(colons.nth(0)).not.toHaveClass(/over-limit/);
  await expect(colons.nth(1)).toHaveClass(/over-limit/);
});

test('Reverb Range stable wheel scroll commits immediately and accepts consecutive ticks', async ({ page }, info) => {
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
  await start.fill('0:00.0');
  await page.keyboard.press('Enter');
  await end.fill('14:00.0');
  await page.keyboard.press('Enter');
  const box = await wheel.boundingBox();
  if (!box) throw new Error('Range duration wheel has no geometry');
  await page.mouse.move(box.x + box.width * 0.39, box.y + box.height * 0.5);

  await page.mouse.wheel(0, -120);
  await expect(exportButton).toBeEnabled();
  await expect(wheel).not.toHaveAttribute('data-editing', '');
  await expect(wheel).toHaveAttribute('aria-valuenow', '780');

  await page.mouse.wheel(0, -120);
  await expect(exportButton).toBeEnabled();
  await expect(wheel).toHaveAttribute('aria-valuenow', '720');
});

test('Reverb Range wheel colon gaps do not claim a wheel column', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('#openRange').click();

  const start = host.getByRole('textbox', { name: 'Start time' });
  const end = host.getByRole('textbox', { name: 'End time' });
  const wheel = host.getByRole('spinbutton', { name: 'Range duration' });
  await start.fill('5:00.0');
  await page.keyboard.press('Enter');
  await end.fill('20:00.0');
  await page.keyboard.press('Enter');

  const before = await wheel.getAttribute('aria-valuenow');
  const wheelBox = await wheel.boundingBox();
  const colonBox = await wheel.locator('.wheel-colon').first().boundingBox();
  if (!wheelBox || !colonBox) throw new Error('Range wheel geometry is unavailable');
  const x = colonBox.x + colonBox.width / 2;
  const y = wheelBox.y + wheelBox.height * 0.15;

  await page.mouse.click(x, y);
  await expect(wheel).toHaveAttribute('aria-valuenow', before ?? '');
  await expect(wheel).not.toHaveAttribute('data-editing', '');

  await page.mouse.move(x, wheelBox.y + wheelBox.height / 2);
  await page.mouse.wheel(0, 120);
  await expect(wheel).toHaveAttribute('aria-valuenow', before ?? '');
});

test('Reverb Range cancelled wheel press snaps without executing a tap step', async ({ page }, info) => {
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

  const beforeStart = await start.textContent();
  const beforeDuration = await wheel.getAttribute('aria-valuenow');
  const box = await wheel.boundingBox();
  if (!box) throw new Error('Range duration wheel has no geometry');
  const x = box.x + box.width * 0.39;
  const y = box.y + box.height * 0.15;
  await wheel.evaluate(element => {
    element.addEventListener('pointerdown', event => {
      element.dataset.testPointerId = String(event.pointerId);
    }, { once: true });
  });

  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(exportButton).toBeDisabled();
  const pointerId = Number(await wheel.getAttribute('data-test-pointer-id'));
  expect(pointerId).toBeGreaterThanOrEqual(0);
  await wheel.evaluate((element, payload) => {
    element.dispatchEvent(new PointerEvent('pointercancel', {
      bubbles: true,
      pointerId: payload.pointerId,
      pointerType: 'mouse',
      clientX: payload.x,
      clientY: payload.y,
      button: 0,
    }));
  }, { pointerId, x, y });
  await expect(exportButton).toBeEnabled();
  await page.mouse.up();
  await page.waitForTimeout(50);

  await expect(wheel).toHaveAttribute('aria-valuenow', beforeDuration ?? '');
  await expect(start).toHaveText(beforeStart ?? '');
});

test('Reverb Range stepped profiles follow actual off-grid wheel rows', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('#openRange').click();

  const start = host.getByRole('textbox', { name: 'Start time' });
  const end = host.getByRole('textbox', { name: 'End time' });
  const wheel = host.getByRole('spinbutton', { name: 'Range duration' });
  await start.fill('0:00.0');
  await page.keyboard.press('Enter');
  await end.fill('14:00.0');
  await page.keyboard.press('Enter');

  const box = await wheel.boundingBox();
  if (!box) throw new Error('Range duration wheel has no geometry');
  await page.mouse.click(box.x + box.width * 0.92, box.y + box.height * 0.84);
  await expect(wheel).toHaveAttribute('aria-valuetext', / 5x$/);
  await expect(wheel).toHaveAttribute('aria-valuenow', '840');

  await page.mouse.move(box.x + box.width * 0.39, box.y + box.height / 2);
  await page.mouse.wheel(0, -120);
  await expect(wheel).toHaveAttribute('aria-valuenow', '600');

  await end.fill('14:00.0');
  await page.keyboard.press('Enter');
  await expect(wheel).toHaveAttribute('aria-valuenow', '840');
  await page.mouse.move(box.x + box.width * 0.39, box.y + box.height / 2);
  await page.mouse.wheel(0, 120);
  await expect(wheel).toHaveAttribute('aria-valuenow', '900');
});


test('Reverb Range wheel can select an exact-boundary over-limit combination', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('.buffer-segment[data-buffer="loop"]').click();
  await host.locator('#openRange').click();

  const start = host.getByRole('textbox', { name: 'Start time' });
  const end = host.getByRole('textbox', { name: 'End time' });
  const wheel = host.getByRole('spinbutton', { name: 'Range duration' });
  const exportButton = host.locator('#rangeExport');
  await start.fill('0:00.0');
  await page.keyboard.press('Enter');
  await end.fill('13:30:59.0');
  await page.keyboard.press('Enter');

  const box = await wheel.boundingBox();
  if (!box) throw new Error('Range duration wheel has no geometry');
  await page.mouse.click(box.x + box.width * 0.92, box.y + box.height * 0.84);
  await expect(wheel).toHaveAttribute('aria-valuetext', / 5x$/);

  await page.mouse.move(box.x + box.width * 0.39, box.y + box.height / 2);
  await page.mouse.wheel(0, 120);
  await expect(wheel).toHaveAttribute('aria-valuenow', String(13 * 3600 + 31 * 60 + 59));
  await expect(end).toHaveText('13:31:59.0');
  await expect(exportButton).toBeDisabled();
  const currentFaces = wheel.locator('.wheel-face.current:not(.wheel-profile)');
  await expect(currentFaces.nth(0)).not.toHaveClass(/over-limit/);
  await expect(currentFaces.nth(1)).not.toHaveClass(/over-limit/);
  await expect(currentFaces.nth(2)).toHaveClass(/over-limit/);
});

test('Reverb Range duration wheel keeps the first active touch pointer', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('#openRange').click();

  const wheel = host.getByRole('spinbutton', { name: 'Range duration' });
  const exportButton = host.locator('#rangeExport');
  const box = await wheel.boundingBox();
  if (!box) throw new Error('Range duration wheel has no geometry');
  const x = box.x + box.width * 0.68;
  const y = box.y + box.height / 2;

  await wheel.evaluate((element, payload) => {
    element.setPointerCapture = () => {};
    element.releasePointerCapture = () => {};
    element.hasPointerCapture = () => false;
    const send = (type, pointerId) => element.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      pointerId,
      pointerType: 'touch',
      isPrimary: pointerId === 41,
      clientX: payload.x,
      clientY: payload.y,
      button: 0,
    }));
    send('pointerdown', 41);
    send('pointerdown', 42);
  }, { x, y });
  await expect(exportButton).toBeDisabled();

  await wheel.evaluate((element, payload) => {
    element.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      pointerId: 41,
      pointerType: 'touch',
      isPrimary: true,
      clientX: payload.x,
      clientY: payload.y,
      button: 0,
    }));
  }, { x, y });
  await expect(exportButton).toBeEnabled();
});

test('Reverb Range waveform scrub keeps the first active touch pointer', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('#openRange').click();

  const play = host.locator('#rangePlay');
  const wavebox = host.locator('.range-timeline .wavebox');
  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
  const box = await wavebox.boundingBox();
  if (!box) throw new Error('Range waveform has no geometry');
  const y = box.y + box.height / 2;

  await wavebox.evaluate((element, payload) => {
    element.setPointerCapture = () => {};
    element.releasePointerCapture = () => {};
    element.hasPointerCapture = () => false;
    const send = (type, pointerId, x) => element.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      pointerId,
      pointerType: 'touch',
      isPrimary: pointerId === 51,
      clientX: x,
      clientY: payload.y,
      button: 0,
    }));
    send('pointerdown', 51, payload.firstX);
    send('pointerdown', 52, payload.secondX);
  }, { y, firstX: box.x + box.width * 0.35, secondX: box.x + box.width * 0.65 });
  await expect(play).toHaveAttribute('aria-label', 'Play');

  await wavebox.evaluate((element, payload) => {
    element.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      pointerId: 51,
      pointerType: 'touch',
      isPrimary: true,
      clientX: payload.x,
      clientY: payload.y,
      button: 0,
    }));
  }, { x: box.x + box.width * 0.35, y });
  await expect(play).toHaveAttribute('aria-label', 'Pause');
});

test('Reverb Range fine seek keeps the first active touch pointer', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('#openRange').click();

  const play = host.locator('#rangePlay');
  const fine = host.locator('.fine-control');
  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
  const box = await fine.boundingBox();
  if (!box) throw new Error('Fine seek has no geometry');
  const y = box.y + box.height / 2;

  await fine.evaluate((element, payload) => {
    element.setPointerCapture = () => {};
    element.releasePointerCapture = () => {};
    element.hasPointerCapture = () => false;
    const send = (type, pointerId, x) => element.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      pointerId,
      pointerType: 'touch',
      isPrimary: pointerId === 61,
      clientX: x,
      clientY: payload.y,
      button: 0,
    }));
    send('pointerdown', 61, payload.firstX);
    send('pointerdown', 62, payload.secondX);
  }, { y, firstX: box.x + 16, secondX: box.x + box.width - 16 });
  await expect(fine).toHaveClass(/is-dragging/);
  await expect(play).toHaveAttribute('aria-label', 'Play');

  await fine.evaluate((element, payload) => {
    element.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      pointerId: 61,
      pointerType: 'touch',
      isPrimary: true,
      clientX: payload.x,
      clientY: payload.y,
      button: 0,
    }));
  }, { x: box.x + 16, y });
  await expect(fine).not.toHaveClass(/is-dragging/);
  await expect(play).toHaveAttribute('aria-label', 'Pause');
});

test('Reverb Range waveform scrub releases ownership after pointer capture loss', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('#openRange').click();

  const play = host.locator('#rangePlay');
  const wavebox = host.locator('.range-timeline .wavebox');
  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
  const box = await wavebox.boundingBox();
  if (!box) throw new Error('Range waveform has no geometry');
  const x = box.x + box.width * 0.35;
  const y = box.y + box.height / 2;
  await wavebox.evaluate(element => {
    element.addEventListener('pointerdown', event => {
      element.dataset.testPointerId = String(event.pointerId);
    }, { once: true });
  });

  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(play).toHaveAttribute('aria-label', 'Play');
  const pointerId = Number(await wavebox.getAttribute('data-test-pointer-id'));
  expect(pointerId).toBeGreaterThanOrEqual(0);
  await wavebox.evaluate((element, id) => {
    element.dispatchEvent(new PointerEvent('lostpointercapture', {
      bubbles: true,
      pointerId: id,
      pointerType: 'mouse',
    }));
  }, pointerId);
  await expect(play).toHaveAttribute('aria-label', 'Pause');

  await page.mouse.up();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
});

test('Reverb Range boundary capture loss pauses preview without moving the marker', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();
  await host.locator('#openRange').click();

  const start = host.getByRole('textbox', { name: 'Start time' });
  const play = host.locator('#rangePlay');
  const wavebox = host.locator('.range-timeline .wavebox');
  const boundary = host.locator('#rangeStartBoundary');
  await start.fill('5:00.0');
  await page.keyboard.press('Enter');
  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
  const before = await start.textContent();
  const box = await boundary.boundingBox();
  if (!box) throw new Error('Range start boundary has no geometry');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await wavebox.evaluate(element => {
    element.addEventListener('pointerdown', event => {
      element.dataset.testPointerId = String(event.pointerId);
    }, { once: true });
  });

  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
  const pointerId = Number(await wavebox.getAttribute('data-test-pointer-id'));
  expect(pointerId).toBeGreaterThanOrEqual(0);
  await wavebox.evaluate((element, id) => {
    element.dispatchEvent(new PointerEvent('lostpointercapture', {
      bubbles: true,
      pointerId: id,
      pointerType: 'mouse',
    }));
  }, pointerId);
  await expect(play).toHaveAttribute('aria-label', 'Play');
  await expect(start).toHaveText(before ?? '');
  await page.mouse.up();
  await expect(start).toHaveText(before ?? '');
});
