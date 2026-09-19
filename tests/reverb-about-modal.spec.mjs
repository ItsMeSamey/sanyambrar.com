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

async function snapshot(locator) {
  return locator.evaluate(element => ({
    inert: element.inert,
    ariaHidden: element.getAttribute('aria-hidden'),
  }));
}

test('Reverb About isolates and restores its active screen', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const about = host.locator('#aboutSheet');
  const aboutClose = host.locator('#aboutClose');
  const aboutRepo = host.locator('.about-repo');

  const cases = [
    {
      screen: '#homeScreen',
      opener: '#brandButton',
      backgroundFocus: '#openSettings',
      enter: async () => {},
    },
    {
      screen: '#libraryScreen',
      opener: '#libraryBrand',
      backgroundFocus: '#libraryBack',
      enter: async () => host.locator('#openLibrary').click(),
    },
    {
      screen: '#rangeScreen',
      opener: '#rangeBrand',
      backgroundFocus: '#rangeClose',
      enter: async () => host.locator('#openRange').click(),
    },
  ];

  for (const entry of cases) {
    await entry.enter();
    const screen = host.locator(entry.screen);
    const opener = host.locator(entry.opener);
    const backgroundFocus = host.locator(entry.backgroundFocus);
    const before = await snapshot(screen);

    await opener.focus();
    await opener.click();
    await expect(about).toHaveAttribute('aria-hidden', 'false');
    await expect.poll(() => about.evaluate(element => element.inert)).toBe(false);
    await expect.poll(() => screen.evaluate(element => element.inert)).toBe(true);
    await expect(screen).toHaveAttribute('aria-hidden', 'true');
    await expect(aboutClose).toBeFocused();

    await backgroundFocus.evaluate(element => element.focus());
    await expect(aboutClose).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(aboutRepo).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(aboutClose).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(about).toHaveAttribute('aria-hidden', 'true');
    await expect.poll(() => about.evaluate(element => element.inert)).toBe(true);
    expect(await snapshot(screen)).toEqual(before);
    await expect(opener).toBeFocused();

    if (entry.screen === '#libraryScreen')
      await host.locator('#libraryBack').click();
    else if (entry.screen === '#rangeScreen')
      await host.locator('#rangeClose').click();
  }
});

test('Reverb About remains the inner modal inside fullscreen', async ({ page }, info) => {
  await visitReverb(page, info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const frame = page.locator('.reverb-demo-frame');
  const fullscreen = page.getByRole('button', { name: 'Fullscreen demo' });
  const home = host.locator('#homeScreen');
  const brand = host.locator('#brandButton');
  const about = host.locator('#aboutSheet');
  const aboutClose = host.locator('#aboutClose');

  await fullscreen.click();
  await expect(frame).toHaveClass(/is-fullscreen/);
  await brand.click();
  await expect(aboutClose).toBeFocused();
  await expect.poll(() => home.evaluate(element => element.inert)).toBe(true);
  await expect(home).toHaveAttribute('aria-hidden', 'true');

  await host.locator('#openSettings').evaluate(element => element.focus());
  await expect(aboutClose).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(about).toHaveAttribute('aria-hidden', 'true');
  await expect.poll(() => home.evaluate(element => element.inert)).toBe(false);
  await expect(home).not.toHaveAttribute('aria-hidden', 'true');
  await expect(brand).toBeFocused();
  await expect(frame).toHaveClass(/is-fullscreen/);

  await page.keyboard.press('Escape');
  await expect(frame).not.toHaveClass(/is-fullscreen/);
  await expect(fullscreen).toBeFocused();
});
