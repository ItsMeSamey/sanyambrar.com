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

async function dragPuck(page, puck, dx, dy = 0, holdMs = 360) {
  const box = await puck.boundingBox();
  if (!box) throw new Error('Fine-seek puck has no geometry');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 4 });
  await page.waitForTimeout(holdMs);
  await page.mouse.up();
}

test('Reverb fine-seek puck distinguishes playback clicks from boundary drags', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();

  await host.locator('#openRange').click();
  const start = host.getByRole('textbox', { name: 'Start time' });
  const end = host.getByRole('textbox', { name: 'End time' });
  const puck = host.locator('#rangePlay');
  const fine = host.locator('.fine-control');

  await expect(puck).toHaveAttribute('aria-label', 'Play');
  await puck.click();
  await expect(puck).toHaveAttribute('aria-label', 'Pause');
  await puck.click();
  await expect(puck).toHaveAttribute('aria-label', 'Play');

  const startBefore = parseRangeTime((await start.textContent()) ?? '');
  const endBefore = parseRangeTime((await end.textContent()) ?? '');
  await dragPuck(page, puck, 110, 0);
  const startAfter = parseRangeTime((await start.textContent()) ?? '');
  expect(startAfter).toBeGreaterThan(startBefore + 1);
  expect(parseRangeTime((await end.textContent()) ?? '')).toBeCloseTo(endBefore, 1);
  await expect(puck).toHaveAttribute('aria-label', 'Play');
  await expect(fine).not.toHaveClass(/is-dragging/);
  await expect(puck).toHaveJSProperty('style.transform', 'translate(0px, 0px)');

  await page.waitForTimeout(240);
  await expect.poll(() => puck.evaluate(element => element.style.transition)).toBe('');

  await end.focus();
  const endBeforeLeftDrag = parseRangeTime((await end.textContent()) ?? '');
  await dragPuck(page, puck, -110, 0);
  const endAfterLeftDrag = parseRangeTime((await end.textContent()) ?? '');
  expect(endAfterLeftDrag).toBeLessThan(endBeforeLeftDrag - 1);
  expect(parseRangeTime((await start.textContent()) ?? '')).toBeCloseTo(startAfter, 1);
  await expect(puck).toHaveAttribute('aria-label', 'Play');
});

test('Reverb fine-seek drag cancels and springs home on window blur', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  if (await blob.getAttribute('aria-label') === 'Tap to pause capture')
    await blob.click();

  await host.locator('#openRange').click();
  const puck = host.locator('#rangePlay');
  const fine = host.locator('.fine-control');
  const box = await puck.boundingBox();
  if (!box) throw new Error('Fine-seek puck has no geometry');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 100, y - 24, { steps: 4 });
  await page.waitForTimeout(120);
  await expect(fine).toHaveClass(/is-dragging/);
  expect(await puck.evaluate(element => element.style.transform)).not.toBe('translate(0px, 0px)');

  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(fine).not.toHaveClass(/is-dragging/);
  await page.waitForTimeout(240);
  await expect.poll(() => puck.evaluate(element => ({
    transform: element.style.transform,
    transition: element.style.transition,
  }))).toEqual({ transform: 'translate(0px, 0px)', transition: '' });
  await page.mouse.up();

  await puck.click();
  await expect(puck).toHaveAttribute('aria-label', 'Pause');
});
