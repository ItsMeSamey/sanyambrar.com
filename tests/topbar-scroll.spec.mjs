import { test, expect } from '@playwright/test';

for (const path of ['/', '/blog/1']) {
  test(`top bar follows scroll direction and keyboard focus on ${path}`, async ({ page }, info) => {
    const metadata = info.project.metadata;
    const port = metadata.development ? metadata.sitePort : metadata.port;
    await page.setViewportSize({ width: 390, height: 420 });
    await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: 'networkidle' });
    const bar = page.locator('.site-topbar');
    const top = () => bar.evaluate(element => element.getBoundingClientRect().top);
    await expect.poll(top).toBe(0);
    await page.evaluate(() => scrollTo({ top: 600, behavior: 'instant' }));
    await expect.poll(() => bar.evaluate(element => element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(1);
    await page.evaluate(() => scrollBy({ top: -40, behavior: 'instant' }));
    await expect.poll(top).toBe(0);
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await page.evaluate(() => scrollBy({ top: 60, behavior: 'instant' }));
    await expect.poll(() => bar.evaluate(element => element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(1);
    await bar.getByRole('button', { name: 'Appearance', exact: true }).evaluate(element => element.focus({ preventScroll: true }));
    await expect.poll(top).toBe(0);
    await page.keyboard.press('Enter');
    await expect(page.locator('.samey-theme-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.evaluate(() => { document.activeElement?.blur(); scrollTo({ top: 0, behavior: 'instant' }); });
    await expect.poll(top).toBe(0);
  });
}
