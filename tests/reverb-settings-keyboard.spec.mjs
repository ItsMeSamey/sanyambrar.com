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

test('Reverb settings dropdown owns keyboard focus without dismissing fullscreen', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const frame = page.locator('.reverb-demo-frame');
  const fullscreen = page.getByRole('button', { name: 'Fullscreen demo' });
  await fullscreen.click();
  await expect(frame).toHaveClass(/is-fullscreen/);

  await host.locator('#openSettings').click();
  const done = host.locator('#settingsDone');
  await expect(done).toBeDisabled();

  const trigger = host.locator('.settings-card.dropdown').first();
  const nextTrigger = host.locator('.settings-card.dropdown').nth(1);
  const menu = host.locator('#dropdownMenu');
  await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  await expect(trigger).toHaveAttribute('aria-controls', 'dropdownMenu');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');

  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute('role', 'menu');
  await expect(menu).toHaveAttribute('aria-hidden', 'false');
  await expect(menu).toHaveAttribute('aria-label', 'Channels options');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');

  const mono = host.getByRole('menuitemradio', { name: 'Mono' });
  const stereo = host.getByRole('menuitemradio', { name: 'Stereo' });
  await expect(mono).toHaveAttribute('aria-checked', 'true');
  await expect(stereo).toHaveAttribute('aria-checked', 'false');
  await expect(mono).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await expect(stereo).toBeFocused();
  await page.keyboard.press('Home');
  await expect(mono).toBeFocused();
  await page.keyboard.press('End');
  await expect(stereo).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(menu).toHaveAttribute('aria-hidden', 'true');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  await expect(frame).toHaveClass(/is-fullscreen/);

  await page.keyboard.press('Enter');
  await expect(mono).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(menu).toBeHidden();
  await expect(nextTrigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(frame).toHaveClass(/is-fullscreen/);

  await trigger.click();
  await expect(menu).toBeVisible();
  await trigger.click();
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(mono).toBeFocused();
  await stereo.click();
  await expect(menu).toBeHidden();
  await expect(trigger.locator('.value')).toHaveText('Stereo');
  await expect(trigger).toBeFocused();
  await expect(done).toBeEnabled();
  await expect(host.locator('#settingsNav')).toHaveAttribute('aria-label', 'Undo');

  await trigger.click();
  await expect(menu).toBeVisible();
  await page.setViewportSize({ width: 412, height: 700 });
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  for (const viewport of [
    { width: 411, height: 912 },
    { width: 320, height: 240 },
    { width: 180, height: 220 },
    { width: 128, height: 220 },
  ]) {
    await page.setViewportSize(viewport);
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await expect(menu).toBeVisible();
    await expect.poll(async () => {
      const box = await menu.boundingBox();
      return !!box
        && box.x >= -1
        && box.y >= -1
        && box.x + box.width <= viewport.width + 1
        && box.y + Math.min(box.height, viewport.height) <= viewport.height + 1;
    }, { message: `Scaled fullscreen dropdown must stay onscreen at ${viewport.width}x${viewport.height}` }).toBe(true);
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    const overlap = await page.evaluate(() => {
      const frame = document.querySelector('.reverb-demo-frame.is-fullscreen');
      const host = document.querySelector('.reverb-demo-host');
      const exit = frame?.querySelector('.reverb-demo-fullscreen-button');
      const done = host?.shadowRoot?.querySelector('#settingsDone');
      if (!(exit instanceof HTMLElement) || !(done instanceof HTMLElement)) return Number.POSITIVE_INFINITY;
      const a = exit.getBoundingClientRect(), b = done.getBoundingClientRect();
      return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
        * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    });
    expect(overlap, `Fullscreen exit must not cover Settings Done at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(1);
  }

  await done.click();
  await expect(host.locator('#homeScreen')).toHaveClass(/active/);
  await expect(frame).toHaveClass(/is-fullscreen/);
  await page.keyboard.press('Escape');
  await expect(frame).not.toHaveClass(/is-fullscreen/);
});
