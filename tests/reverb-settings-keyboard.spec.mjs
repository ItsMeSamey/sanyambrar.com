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

  await done.click();
  await expect(host.locator('#homeScreen')).toHaveClass(/active/);
  await expect(frame).toHaveClass(/is-fullscreen/);
  await page.keyboard.press('Escape');
  await expect(frame).not.toHaveClass(/is-fullscreen/);
});
