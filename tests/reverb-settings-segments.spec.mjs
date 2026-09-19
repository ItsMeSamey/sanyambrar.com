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

test('Reverb Settings segmented controls expose native radio semantics', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');
  const blobTime = host.locator('#blobTime');
  await blob.click();
  await expect(blob).toHaveAttribute('aria-label', 'Tap to start capture');
  const initialBufferTime = await blobTime.textContent();
  await host.locator('#openSettings').click();

  const theme = host.getByRole('radiogroup', { name: 'Theme' });
  const retention = host.getByRole('radiogroup', { name: 'Retention' });
  const auto = theme.getByRole('radio', { name: 'Auto' });
  const light = theme.getByRole('radio', { name: 'Light' });
  const dark = theme.getByRole('radio', { name: 'Dark' });
  const time = retention.getByRole('radio', { name: 'Time' });
  const size = retention.getByRole('radio', { name: 'Size' });
  const nav = host.locator('#settingsNav');
  const done = host.locator('#settingsDone');
  const oneRetention = host.locator('#oneRetention');

  await expect(auto).toHaveAttribute('aria-checked', 'true');
  await expect(auto).toHaveAttribute('tabindex', '0');
  await expect(light).toHaveAttribute('aria-checked', 'false');
  await expect(light).toHaveAttribute('tabindex', '-1');
  await expect(dark).toHaveAttribute('aria-checked', 'false');
  await expect(dark).toHaveAttribute('tabindex', '-1');
  await expect(time).toHaveAttribute('aria-checked', 'true');
  await expect(time).toHaveAttribute('tabindex', '0');
  await expect(size).toHaveAttribute('aria-checked', 'false');
  await expect(size).toHaveAttribute('tabindex', '-1');
  await expect(nav).toHaveAttribute('aria-label', 'Back');
  await expect(done).toBeDisabled();

  await auto.click();
  await time.click();
  await expect(nav).toHaveAttribute('aria-label', 'Back');
  await expect(done).toBeDisabled();
  await expect(auto).toHaveAttribute('aria-checked', 'true');
  await expect(time).toHaveAttribute('aria-checked', 'true');

  await auto.focus();
  await page.keyboard.press('ArrowRight');
  await expect(light).toBeFocused();
  await expect(light).toHaveAttribute('aria-checked', 'true');
  await expect(light).toHaveAttribute('tabindex', '0');
  await expect(auto).toHaveAttribute('aria-checked', 'false');
  await expect(auto).toHaveAttribute('tabindex', '-1');
  await expect(nav).toHaveAttribute('aria-label', 'Undo');
  await expect(done).toBeEnabled();

  await page.keyboard.press('End');
  await expect(dark).toBeFocused();
  await expect(dark).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(auto).toBeFocused();
  await expect(auto).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(dark).toBeFocused();
  await page.keyboard.press('Home');
  await expect(auto).toBeFocused();

  await nav.click();
  await expect(nav).toHaveAttribute('aria-label', 'Back');
  await expect(done).toBeDisabled();
  await expect(auto).toHaveAttribute('aria-checked', 'true');
  await expect(auto).toHaveAttribute('tabindex', '0');

  await time.focus();
  await page.keyboard.press('ArrowRight');
  await expect(size).toBeFocused();
  await expect(size).toHaveAttribute('aria-checked', 'true');
  await expect(size).toHaveAttribute('tabindex', '0');
  await expect(time).toHaveAttribute('aria-checked', 'false');
  await expect(oneRetention).toHaveValue('7267');
  await expect(nav).toHaveAttribute('aria-label', 'Undo');
  await expect(done).toBeEnabled();

  await nav.click();
  await expect(time).toHaveAttribute('aria-checked', 'true');
  await expect(time).toHaveAttribute('tabindex', '0');
  await expect(size).toHaveAttribute('aria-checked', 'false');
  await expect(oneRetention).toHaveValue('24:00:00');
  await expect(nav).toHaveAttribute('aria-label', 'Back');
  await expect(done).toBeDisabled();

  await oneRetention.fill('12:34');
  await expect(nav).toHaveAttribute('aria-label', 'Undo');
  await expect(done).toBeEnabled();
  await time.click();
  await expect(oneRetention).toHaveValue('12:34');
  await expect(time).toHaveAttribute('aria-checked', 'true');

  await nav.click();
  await expect(oneRetention).toHaveValue('24:00:00');
  await expect(nav).toHaveAttribute('aria-label', 'Back');
  await expect(done).toBeDisabled();
  await nav.click();
  await expect(host.locator('#homeScreen')).toHaveClass(/active/);
  await expect(blobTime).toHaveText(initialBufferTime ?? '30:00');

  await host.locator('#openSettings').click();
  await auto.focus();
  await page.keyboard.press('Tab');
  await expect(time).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(oneRetention).toBeFocused();

  await oneRetention.fill('12:34');
  await done.click();
  await expect(host.locator('#homeScreen')).toHaveClass(/active/);
  await expect(blobTime).toHaveText('12:34');
});
