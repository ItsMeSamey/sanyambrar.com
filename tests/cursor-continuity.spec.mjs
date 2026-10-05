import { test, expect } from '@playwright/test';

for (const menuOpen of [false, true]) test(`link blob carries its geometry between targets with context menu ${menuOpen}`, async ({ page }, info) => {
  test.skip(info.project.name === 'production-mobile', 'The blob requires a fine pointer');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const meta = info.project.metadata;
  await page.goto(`http://127.0.0.1:${meta.development ? meta.sitePort : meta.port}/`);
  await page.evaluate(() => {
    for (const [index, left] of [60, 460].entries()) {
      const link = document.createElement('a');
      link.id = `continuity-${index}`;
      link.href = '/work/';
      link.style.cssText = `position:fixed;left:${left}px;top:120px;width:240px;height:160px;border-radius:24px;background:var(--site-bg);z-index:100`;
      document.body.append(link);
    }
  });
  const fill = page.locator('.samey-cursor-link-fill-slice');
  await page.mouse.move(180, 200);
  await expect.poll(async () => (await fill.boundingBox())?.width ?? 0).toBeGreaterThan(220);
  if (menuOpen) {
    await page.mouse.click(180, 200, { button: 'right' });
    await expect(page.getByRole('menu', { name: 'Context menu' })).toBeVisible();
  }
  // Record actual animation frames, including the first frame of the handoff.
  await page.evaluate(() => {
    window.blobFrames = [];
    window.blobRecording = true;
    const record = () => {
      const rect = document.querySelector('.samey-cursor-link-fill-slice').getBoundingClientRect();
      window.blobFrames.push({ x: rect.x, width: rect.width, height: rect.height });
      if (window.blobRecording) requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });
  await page.mouse.move(580, 200);
  await expect.poll(async () => (await fill.boundingBox())?.x ?? 0).toBeGreaterThan(465);
  const frames = await page.evaluate(() => { window.blobRecording = false; return window.blobFrames; });
  expect(frames.length).toBeGreaterThan(2);
  expect(frames.every(frame => frame.width > 210 && frame.height > 140)).toBe(true);
  expect(frames.some(frame => frame.x > 100 && frame.x < 440)).toBe(true);
  if (menuOpen) await expect(page.getByRole('menu', { name: 'Context menu' })).toBeVisible();
});
