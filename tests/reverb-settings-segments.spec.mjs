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
  await expect(host.locator('#oneRetentionUnit')).toBeHidden();
  await expect(host.locator('#loopRetentionUnit')).toBeHidden();
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
  await expect(oneRetention).toHaveValue('6');
  await expect(host.locator('#loopRetention')).toHaveValue('4199');
  await expect(host.locator('#oneRetentionUnit')).toHaveText('MiB');
  await expect(host.locator('#oneRetentionUnit')).toBeVisible();
  await expect(host.locator('#loopRetentionUnit')).toBeVisible();
  await expect(host.locator('#oneEstimate')).toHaveText('≈ 1.2 min');
  await expect(host.locator('#loopEstimate')).toHaveText('≈ 832 min');
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

test('Reverb retention drafts survive mode switches and invalid Done stays in Settings', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  await host.locator('#openSettings').click();

  const time = host.getByRole('radio', { name: 'Time' });
  const size = host.getByRole('radio', { name: 'Size' });
  const one = host.locator('#oneRetention');
  const loop = host.locator('#loopRetention');
  const error = host.locator('#retentionError');
  const nav = host.locator('#settingsNav');
  const done = host.locator('#settingsDone');

  await one.fill('nonsense');
  await expect(nav).toHaveAttribute('aria-label', 'Undo');
  await expect(done).toBeEnabled();
  await size.click();
  await expect(one).toHaveValue('6');
  await expect(loop).toHaveValue('4199');
  await time.click();
  await expect(one).toHaveValue('nonsense');
  await expect(loop).toHaveValue('48:00:00');

  await done.click();
  await expect(host.locator('#settingsScreen')).toHaveClass(/active/);
  await expect(error).toBeVisible();
  await expect(error).toHaveText('Use H:MM:SS.');
  await expect(one).toHaveAttribute('aria-invalid', 'true');
  await expect(loop).not.toHaveAttribute('aria-invalid', 'true');

  await one.fill('1440');
  await expect(error).toBeHidden();
  await expect(one).not.toHaveAttribute('aria-invalid', 'true');
  await expect(nav).toHaveAttribute('aria-label', 'Back');
  await expect(done).toBeDisabled();

  await one.fill('12:34');
  await size.click();
  await one.fill('7');
  await time.click();
  await expect(one).toHaveValue('12:34');
  await size.click();
  await expect(one).toHaveValue('7');

  await one.fill('bad');
  await time.click();
  await expect(one).toHaveValue('12:34');
  await size.click();
  await expect(one).toHaveValue('bad');
  await done.click();
  await expect(host.locator('#settingsScreen')).toHaveClass(/active/);
  await expect(error).toHaveText('Enter a valid number.');
  await expect(one).toHaveAttribute('aria-invalid', 'true');

  await time.click();
  await expect(error).toBeHidden();
  await size.click();
  await expect(error).toBeVisible();
  await expect(error).toHaveText('Enter a valid number.');
  await expect(one).toHaveAttribute('aria-invalid', 'true');

  await nav.click();
  await expect(time).toHaveAttribute('aria-checked', 'true');
  await expect(one).toHaveValue('24:00:00');
  await expect(loop).toHaveValue('48:00:00');
  await expect(error).toBeHidden();
  await expect(nav).toHaveAttribute('aria-label', 'Back');
  await expect(done).toBeDisabled();

  await size.click();
  await one.fill('0');
  await loop.fill('0');
  await done.click();
  await expect(host.locator('#settingsScreen')).toHaveClass(/active/);
  await expect(error).toHaveText('Keep at least one buffer on.');
  await expect(one).toHaveAttribute('aria-invalid', 'true');
  await expect(loop).toHaveAttribute('aria-invalid', 'true');

  await nav.click();
  await size.click();
  await one.fill('bad');
  await time.click();
  await expect(nav).toHaveAttribute('aria-label', 'Back');
  await expect(done).toBeDisabled();
  await nav.click();
  await expect(host.locator('#homeScreen')).toHaveClass(/active/);

  await host.locator('#openSettings').click();
  await size.click();
  await expect(one).toHaveValue('6');
  await expect(loop).toHaveValue('4199');
  await expect(error).toBeHidden();
});
