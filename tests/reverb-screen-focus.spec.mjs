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

async function expectScreenFocus(host, screenId, focusId) {
  await expect(host.locator('#' + screenId)).toHaveClass(/active/);
  await expect.poll(() => host.evaluate((element, expected) => {
    const active = element.shadowRoot?.activeElement;
    return active instanceof HTMLElement
      ? { id: active.id, visible: active.getClientRects().length > 0 }
      : null;
  }, focusId), { message: `${screenId} should own focus at #${focusId}` })
    .toEqual({ id: focusId, visible: true });
}

test('Reverb screen transitions preserve logical keyboard focus', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });

  await host.locator('#openSettings').click();
  await expectScreenFocus(host, 'settingsScreen', 'settingsNav');
  await host.locator('#settingsNav').click();
  await expectScreenFocus(host, 'homeScreen', 'openSettings');

  await host.locator('#openLibrary').click();
  await expectScreenFocus(host, 'libraryScreen', 'libraryBack');
  await host.locator('#libraryBack').click();
  await expectScreenFocus(host, 'homeScreen', 'openLibrary');

  await host.locator('#openIncidents').click();
  await expectScreenFocus(host, 'incidentsScreen', 'incidentsBack');
  await host.locator('#incidentsBack').click();
  await expectScreenFocus(host, 'homeScreen', 'openIncidents');

  await host.locator('#openRange').click();
  await expectScreenFocus(host, 'rangeScreen', 'rangeDurationWheel');
  for (const focusId of ['rangeStart', 'rangeEnd', 'rangePlay', 'rangeClose', 'rangeExport']) {
    await page.keyboard.press('Tab');
    await expectScreenFocus(host, 'rangeScreen', focusId);
  }

  await host.locator('#rangeSettings').click();
  await expectScreenFocus(host, 'settingsScreen', 'settingsNav');
  await host.locator('#settingsNav').click();
  await expectScreenFocus(host, 'rangeScreen', 'rangeSettings');

  await host.locator('#rangeIncidents').click();
  await expectScreenFocus(host, 'incidentsScreen', 'incidentsBack');
  await host.locator('#incidentsBack').click();
  await expectScreenFocus(host, 'rangeScreen', 'rangeIncidents');

  await host.locator('#rangeClose').click();
  await expectScreenFocus(host, 'homeScreen', 'openRange');

  await host.locator('#openLibrary').click();
  await host.locator('#librarySettings').click();
  await expectScreenFocus(host, 'settingsScreen', 'settingsNav');
  await host.locator('#settingsNav').click();
  await expectScreenFocus(host, 'homeScreen', 'openLibrary');

  await host.locator('#openLibrary').click();
  await host.locator('#libraryIncidents').click();
  await expectScreenFocus(host, 'incidentsScreen', 'incidentsBack');
  await host.locator('#incidentsBack').click();
  await expectScreenFocus(host, 'homeScreen', 'openLibrary');

  await host.locator('#openSettings').click();
  const channels = host.locator('.settings-card.dropdown').first();
  await channels.click();
  await host.getByRole('menuitemradio', { name: 'Stereo' }).click();
  const nav = host.locator('#settingsNav');
  const done = host.locator('#settingsDone');
  await expect(nav).toHaveAttribute('aria-label', 'Undo');
  await expect(done).toBeEnabled();
  await nav.click();
  await expectScreenFocus(host, 'settingsScreen', 'settingsNav');
  await expect(nav).toHaveAttribute('aria-label', 'Back');
  await expect(done).toBeDisabled();
  await nav.click();
  await expectScreenFocus(host, 'homeScreen', 'openSettings');

  await host.locator('#openSettings').click();
  await channels.click();
  await host.getByRole('menuitemradio', { name: 'Stereo' }).click();
  await done.click();
  await expectScreenFocus(host, 'homeScreen', 'openSettings');

  const frame = page.locator('.reverb-demo-frame');
  const fullscreen = page.getByRole('button', { name: 'Fullscreen demo' });
  await fullscreen.click();
  await expect(frame).toHaveClass(/is-fullscreen/);
  await host.locator('#openRange').click();
  await expectScreenFocus(host, 'rangeScreen', 'rangeDurationWheel');
  await host.locator('#rangeClose').click();
  await expectScreenFocus(host, 'homeScreen', 'openRange');
  await expect(frame).toHaveClass(/is-fullscreen/);
  await page.keyboard.press('Escape');
  await expect(frame).not.toHaveClass(/is-fullscreen/);
});

test('Reverb gesture screen transitions retain in-demo focus ownership', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });

  const drag = mode => host.evaluate((element, mode) => {
    const root = element.shadowRoot;
    const phone = root?.querySelector('#phone');
    const blob = root?.querySelector('#blobControl');
    if (!(phone instanceof HTMLElement) || !(blob instanceof HTMLElement))
      throw new Error('Reverb phone/blob is unavailable');
    const phoneRect = phone.getBoundingClientRect();
    const blobRect = blob.getBoundingClientRect();
    let x = phoneRect.left + phoneRect.width / 2;
    let startY;
    let endY;
    if (mode === 'settings') {
      startY = blobRect.top - 20;
      endY = startY + 70;
    } else if (mode === 'library') {
      startY = blobRect.bottom + 20;
      endY = startY - 70;
    } else {
      x = phoneRect.left + 4;
      startY = phoneRect.top + phoneRect.height / 2;
      endY = startY + 80;
    }
    const event = (type, y) => new PointerEvent(type, {
      bubbles: true,
      pointerId: 17,
      pointerType: 'touch',
      isPrimary: true,
      clientX: x,
      clientY: y,
    });
    phone.dispatchEvent(event('pointerdown', startY));
    phone.dispatchEvent(event('pointermove', endY));
    phone.dispatchEvent(event('pointerup', endY));
  }, mode);

  await drag('settings');
  await expectScreenFocus(host, 'settingsScreen', 'settingsNav');
  await host.locator('#settingsNav').click();
  await expectScreenFocus(host, 'homeScreen', 'openSettings');

  await drag('library');
  await expectScreenFocus(host, 'libraryScreen', 'libraryBack');
  await drag('edge');
  await expectScreenFocus(host, 'homeScreen', 'openLibrary');
});
