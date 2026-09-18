import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const EXPECTED_ERROR_SURFACE_MARKER = 'QA_EXPECTED_ERROR_SURFACE';

const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const errors = [], warnings = [];
    page.on('pageerror', error => {
      if (!error.message.includes(EXPECTED_ERROR_SURFACE_MARKER)) errors.push(error.message);
    });
    page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
    page.on('console', message => {
      if (message.type() === 'error' && !message.text().includes(EXPECTED_ERROR_SURFACE_MARKER)) errors.push(message.text());
      if (message.type() === 'warning' && message.text().includes('STRICT_')) warnings.push(message.text());
    });
    await use(page);
    if (warnings.length) await testInfo.attach('upstream-or-reactivity-warnings', { body: JSON.stringify([...new Set(warnings)], null, 2), contentType: 'application/json' });
    expect(errors, 'Browser runtime and console errors').toEqual([]);
  },
});

async function visit(page, route, info) {
  const metadata = info.project.metadata;
  const port = metadata.development ? route.startsWith('/wordle') ? metadata.wordlePort : route.startsWith('/keybr') ? metadata.keybrPort : metadata.sitePort : metadata.port;
  await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle' });
  await expect(page.locator('body')).not.toContainText(/Something's Gone Horridly Wrong|Oh no, something bad|This view failed to render|Editor failed to load/);
}

async function visitKeybr(page, info) {
  await page.addInitScript(() => localStorage.setItem('prefs.practice.tourSeen', 'true'));
  await visit(page, '/keybr', info);
}

async function seedKeybrHistory(page) {
  const now = Date.now();
  const records = Array.from({ length: 48 }, (_, index) => {
    const histogram = {};
    for (const [offset, codePoint] of [97, 98, 99, 100, 101, 102, 103, 104].entries()) {
      histogram[codePoint] = {
        h: 5 + ((index + offset) % 7),
        m: (index + offset) % 3 === 0 ? 1 : 0,
        t: 160 + ((index * 13 + offset * 17) % 180),
      };
    }
    return {
      l: 'en-us',
      m: 'generated',
      ts: now - (48 - index) * 3_600_000,
      n: 60,
      t: 26_000 + (index % 7) * 900,
      e: index % 4,
      h: histogram,
    };
  });
  await page.evaluate(async values => {
    const request = indexedDB.open('history', 1);
    const db = await new Promise((resolve, reject) => {
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('history')) request.result.createObjectStore('history', { autoIncrement: true });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readwrite');
      const store = tx.objectStore('history');
      store.clear();
      for (const value of values) store.add(value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      tx.oncomplete = resolve;
    });
    db.close();
  }, records);
}

async function keybrChartsPainted(page) {
  return page.locator('figure canvas').evaluateAll(canvases => canvases.length === 6 && canvases.every(canvas => {
    const context = canvas.getContext('2d');
    if (!context || canvas.width <= 0 || canvas.height <= 0) return false;
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let painted = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0 && ++painted >= 64) return true;
    }
    return false;
  }));
}

const routes = ['/', '/work/', '/projects/reverb/', '/projects/cnn/', '/projects/zhtml/', '/projects/oneserial/', '/tools/?tool=text', '/tools/?tool=base', '/tools/?tool=diff', '/tools/?tool=number', '/tools/?tool=markdown', '/blog/', '/blog/posts/btop-mutex', '/wordle', '/keybr', '/chain/'];
for (const route of routes) test(`renders ${route}`, async ({ page }, info) => {
  await visit(page, route, info);
  await expect(page.locator('body')).not.toHaveText('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal page overflow').toBe(true);
  expect(await page.title()).not.toBe('');
  expect(new URL(page.url()).pathname, 'Public URLs must be extensionless').not.toMatch(/\.html$/i);
  const htmlLinks = await page.locator('a[href]').evaluateAll(anchors => anchors.flatMap(anchor => {
    const url = new URL(anchor.href, location.href);
    return url.origin === location.origin && /\.html$/i.test(url.pathname) ? [anchor.getAttribute('href')] : [];
  }));
  expect(htmlLinks, 'Internal links must never expose .html').toEqual([]);
});

const legacyHtmlRoutes = [
  '/index.html',
  '/work/index.html',
  '/tools/index.html',
  '/chain/index.html',
  '/blog/index.html',
  '/projects/reverb/index.html',
  '/projects/cnn/index.html',
  '/projects/oneserial/index.html',
  '/projects/zhtml/index.html',
  '/wordle.html',
  '/keybr.html',
  '/blog/posts/btop-mutex.html',
];
for (const legacyRoute of legacyHtmlRoutes) test(`canonicalizes legacy ${legacyRoute}`, async ({ page }, info) => {
  await visit(page, legacyRoute, info);
  const canonicalPath = legacyRoute.endsWith('/index.html') ? legacyRoute.slice(0, -10) : legacyRoute.slice(0, -5);
  await expect.poll(() => new URL(page.url()).pathname).toBe(canonicalPath);
});

test('SPA mount failures surface the original exception stack and cause', async ({ page }, info) => {
  test.skip(Boolean(info.project.metadata.development), 'Production bundle failure injection targets the built Keybr entry module');

  const marker = `${EXPECTED_ERROR_SURFACE_MARKER}: keybr entry root cause`;
  await page.route(/\/keybr-assets\/index-[^/]+\.js(?:\?.*)?$/, route => route.fulfill({
    status: 200,
    contentType: 'text/javascript',
    body: `const cause = new Error(${JSON.stringify(marker)});
window.dispatchEvent(new ErrorEvent('error', {
  message: cause.message,
  error: cause,
  filename: import.meta.url,
  lineno: 1,
  colno: 1,
}));`,
  }));

  await visit(page, '/', info);
  await page.evaluate(() => {
    const navigate = globalThis.SameyNavigate;
    if (!navigate) throw new Error('SameyNavigate is unavailable');
    void navigate('/keybr.html');
  });

  const loadError = page.locator('#samey-load-error');
  const stack = loadError.locator('.samey-error-stack');
  await expect(loadError).toBeVisible();
  await expect(loadError).toContainText('application failed while mounting');
  await expect(stack).toContainText(marker);
  await expect(stack).toContainText('Caused by:');
  await expect(stack).toContainText(`Error: ${marker}`);
});

test('Keybr error page preserves settings failure stack and cause', async ({ page }, info) => {
  const marker = `${EXPECTED_ERROR_SURFACE_MARKER}: keybr settings read root cause`;
  await page.addInitScript(value => {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function(key) {
      if (key === 'settings') throw new Error(value);
      return originalGetItem.call(this, key);
    };
  }, marker);

  const metadata = info.project.metadata;
  const port = metadata.development ? metadata.keybrPort : metadata.port;
  await page.goto(`http://127.0.0.1:${port}/keybr.html`, { waitUntil: 'networkidle' });

  await expect(page.getByRole('heading', { name: 'Error', exact: true })).toBeVisible();
  const report = page.locator('article pre').first();
  await expect(report).toContainText('Could not read Keybr settings');
  await expect(report).toContainText(marker);
  await expect(report).toContainText('Caused by:');
  await expect(report).toContainText(`Error: ${marker}`);
});

test('extreme narrow call-to-actions and article controls stay reachable', async ({ page }, info) => {
  await page.setViewportSize({ width: 128, height: 1000 });
  const expectContained = async selector => {
    const targets = page.locator(selector);
    expect(await targets.count()).toBeGreaterThan(0);
    await expect.poll(() => targets.evaluateAll(elements => elements.every(element => {
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || rect.width === 0 || rect.height === 0) return true;
      return rect.left >= -1 && rect.right <= innerWidth + 1;
    })), { message: `${selector} must remain horizontally reachable at 128px` }).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  };
  await visit(page, '/', info);
  await expectContained('.home-writing-read');
  await visit(page, '/projects/reverb/', info);
  await expectContained('.reverb-demo-store-link');
  await visit(page, '/blog/posts/btop-mutex', info);
  await expectContained('.article-route main button, .article-route main a[href]');
  await visit(page, '/tools/?tool=diff', info);
  await expectContained('[data-diff-language], [data-diff-swap]');
});

test('search scopes wheel handling to the dialog surface', async ({ page }, info) => {
  await page.setViewportSize({ width: 800, height: 220 });
  await visit(page, '/', info);
  await page.evaluate(() => {
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollTo(0, Math.max(1, Math.min(300, max - 100)));
  });
  const backgroundScroll = await page.evaluate(() => scrollY);
  expect(backgroundScroll).toBeGreaterThan(0);

  await page.keyboard.press('Control+K');
  const searchInput = page.getByPlaceholder('Search games, tools, writing, work…');
  const searchResults = page.locator('.site-search-results');
  const searchHeader = page.locator('.site-search-input');
  await searchInput.fill('a');
  await expect(searchResults).toBeVisible();
  expect(await page.evaluate(() => [document.body.style.overflow, document.documentElement.style.overflow])).toEqual(['', '']);
  expect(await searchResults.evaluate(element => getComputedStyle(element).overscrollBehaviorY)).toBe('contain');

  await searchHeader.hover();
  await page.mouse.wheel(0, 320);
  expect(await page.evaluate(() => scrollY), 'Wheel over the dialog header must not scroll the page').toBe(backgroundScroll);

  await searchResults.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await searchResults.hover();
  await page.mouse.wheel(0, 1200);
  expect(await page.evaluate(() => scrollY), 'Wheel past the result-list end must not scroll the page').toBe(backgroundScroll);

  await searchResults.evaluate(element => { element.scrollTop = 0; });
  await page.mouse.wheel(0, -1200);
  expect(await page.evaluate(() => scrollY), 'Wheel past the result-list start must not scroll the page').toBe(backgroundScroll);

  await page.mouse.move(4, 110);
  await page.mouse.wheel(0, 320);
  await expect.poll(() => page.evaluate(() => scrollY), { message: 'Wheel over the blurred background must scroll the underlying page' }).toBeGreaterThan(backgroundScroll);
  await expect(searchInput).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(searchResults).not.toBeVisible();
});

test('search backdrop uses fixed progressive blur', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await visit(page, '/', info);
  await page.keyboard.press('Control+K');
  const search = page.locator('.site-search');
  const backdrop = page.locator('.site-search-backdrop');
  await expect(search).toBeVisible();

  const openStyle = await backdrop.evaluate(element => {
    const style = getComputedStyle(element, '::before');
    return { backdropFilter: style.backdropFilter, animationName: style.animationName, opacity: style.opacity };
  });
  expect(openStyle.backdropFilter).toContain('blur(4px)');
  expect(openStyle.animationName).toBe('samey-search-blur-in');
  expect(openStyle.opacity).toBe('1');

  await page.keyboard.press('Escape');
  await expect(search).toHaveClass(/is-closing/);
  expect(await backdrop.evaluate(element => getComputedStyle(element, '::before').animationName)).toBe('samey-search-blur-out');
  await expect(search).toBeHidden();
});

test('search, SPA navigation, history and theme', async ({ page }, info) => {
  await visit(page, '/', info);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const searchInput = page.getByPlaceholder('Search games, tools, writing, work…');
  const initialViewport = page.viewportSize();
  await page.setViewportSize({ width: 320, height: 180 });
  await searchInput.fill('a');
  await searchInput.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.search-result').last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(searchInput).toBeFocused();
  for (let i = 0; i < 8; i += 1) await page.keyboard.press('ArrowDown');
  const activeSearchResultIsVisible = () => page.locator('.site-search-results').evaluate(element => {
    const active = element.querySelector('.search-result.active');
    if (!(active instanceof HTMLAnchorElement)) return false;
    const bounds = element.getBoundingClientRect(), rect = active.getBoundingClientRect();
    return rect.top >= bounds.top - 1 && rect.bottom <= bounds.bottom + 1;
  });
  await expect.poll(() => activeSearchResultIsVisible()).toBe(true);
  expect(await page.locator('.site-search-results').evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => activeSearchResultIsVisible(), { message: 'ArrowUp must keep the active search result visible' }).toBe(true);
  await page.setViewportSize({ width: 128, height: 128 });
  await expect.poll(() => activeSearchResultIsVisible(), { message: 'Resizing to an extreme short viewport must keep the active search result visible' }).toBe(true);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => activeSearchResultIsVisible(), { message: 'Keyboard search selection must remain visible at 128px viewport height' }).toBe(true);
  const activeResult = page.locator('.search-result.active');
  const { activeHref, activeTitle } = await activeResult.evaluate(element => ({
    activeHref: element.href,
    activeTitle: element.querySelector('b')?.textContent?.trim() ?? '',
  }));
  expect(new URL(activeHref).origin).toBe(new URL(page.url()).origin);
  expect(activeTitle).not.toBe('');
  const destinationLoaded = page.evaluate(() => new Promise(resolve => addEventListener('samey-pageload', () => resolve(true), { once: true })));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(activeHref);
  await destinationLoaded;
  if (initialViewport) await page.setViewportSize(initialViewport);
  const homeLoaded = page.evaluate(() => new Promise(resolve => addEventListener('samey-pageload', () => resolve(true), { once: true })));
  await page.goBack();
  await homeLoaded;
  await expect(page.getByRole('heading', { name: 'Games', exact: true })).toBeVisible();
  const appearance = page.getByRole('button', { name: 'Appearance', exact: true });
  await appearance.click();
  const appearancePanel = page.locator('.samey-theme-panel');
  await page.locator('[data-theme-choice="dark"]').click();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toContain('dark');
  await expect(appearancePanel).not.toBeVisible();
  await appearance.click();
  await expect(appearancePanel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(appearancePanel).not.toBeVisible();
  await expect(appearance).toBeFocused();

  await appearance.click();
  await page.getByRole('button', { name: /Advanced & Colorblind/ }).click();
  const advanced = page.locator('.samey-theme-advanced');
  const closeAdvanced = page.getByRole('button', { name: 'Close Advanced & Colorblind', exact: true });
  await expect(advanced).toBeVisible();
  await expect(advanced).toHaveAttribute('role', 'dialog');
  await expect(advanced).toHaveAttribute('aria-modal', 'true');
  await expect(advanced).toHaveAttribute('aria-labelledby', 'samey-theme-advanced-title');
  await expect(closeAdvanced).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => advanced.evaluate(element => element.contains(document.activeElement)), { message: 'Advanced appearance must trap reverse Tab navigation' }).toBe(true);
  await page.keyboard.press('Tab');
  await expect(closeAdvanced).toBeFocused();
  await page.setViewportSize({ width: 128, height: 1000 });
  await expect.poll(() => advanced.evaluate(element => {
    const controls = [...element.querySelectorAll('button,input,select')].filter(control => {
      const style = getComputedStyle(control), rect = control.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });
    return document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1 && controls.every(control => {
      const rect = control.getBoundingClientRect(); return rect.left >= -1 && rect.right <= innerWidth + 1;
    });
  }), { message: 'Advanced appearance controls must stay usable at 128px' }).toBe(true);
  await page.keyboard.press('Escape');
  await expect(advanced).not.toBeVisible();
  await expect(appearance).toBeFocused();
});

test('loading strip animates only while visible', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await visit(page, '/', info);
  const runningAnimations = () => page.locator('.samey-loading-top-bar').evaluate(element =>
    element.getAnimations().filter(animation => animation.playState === 'running').length);
  await expect.poll(runningAnimations, { message: 'Hidden loading stripe must not keep animating' }).toBe(0);

  await page.evaluate(() => globalThis.SameyLoading?.(true));
  await expect(page.locator('#samey-loading-top')).toHaveCSS('visibility', 'visible');
  await expect.poll(runningAnimations, { message: 'Visible loading stripe must animate' }).toBe(1);

  await page.evaluate(() => globalThis.SameyLoading?.(false));
  await expect.poll(runningAnimations, { message: 'Loading stripe animation must stop when hidden' }).toBe(0);
});

test('appearance menu dismisses when its anchor scrolls away', async ({ page }, info) => {
  await page.setViewportSize({ width: 900, height: 260 });
  await visit(page, '/blog/posts/btop-mutex', info);
  const appearance = page.getByRole('button', { name: 'Appearance', exact: true });
  const panel = page.locator('.samey-theme-panel');

  await appearance.click();
  await expect(panel).toBeVisible();
  await panel.evaluate(element => element.dispatchEvent(new Event('scroll')));
  await expect(panel, 'A scroll event inside the Appearance menu must not dismiss it').toBeVisible();

  await page.mouse.move(40, 220);
  await page.mouse.wheel(0, 450);
  await expect.poll(() => page.evaluate(() => scrollY), { message: 'The page itself must actually scroll' }).toBeGreaterThan(0);
  await expect(panel, 'Appearance menu must dismiss once its trigger moves with page scroll').not.toBeVisible();
  await expect(appearance).toHaveAttribute('aria-expanded', 'false');
});

test('advanced appearance saves, previews, loads and deletes themes', async ({ page }, info) => {
  await visit(page, '/', info);
  const appearance = page.getByRole('button', { name: 'Appearance', exact: true });
  const panel = page.locator('.samey-theme-panel');
  const advanced = page.locator('.samey-theme-advanced');
  const openAdvanced = async () => {
    if (!await panel.isVisible()) {
      await appearance.click();
      await expect(panel).toBeVisible();
    }
    await panel.getByRole('button', { name: /Advanced & Colorblind/ }).click();
    await expect(advanced).toBeVisible();
  };
  await openAdvanced();
  const themeName = advanced.locator('[name="themeName"]');
  const background = advanced.locator('[name="background"]');
  await themeName.fill('QA Theme');
  await background.fill('#123456');
  await expect(advanced.locator('[data-color-for="background"]')).toHaveValue('#123456');
  await advanced.getByRole('button', { name: 'Save theme', exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem('keybr.theme') ?? '{}');
    return !!prefs.savedThemes?.find(theme => theme.name === 'QA Theme') && String(prefs.color).startsWith('saved:');
  })).toBe(true);
  await advanced.getByRole('button', { name: 'Close Advanced & Colorblind', exact: true }).click();
  await expect(advanced).not.toBeVisible();
  await appearance.click();
  const savedChoice = panel.locator('[data-theme-choice^="saved:"]').filter({ hasText: 'QA Theme' });
  await expect(savedChoice).toBeVisible();
  await savedChoice.click();
  await openAdvanced();
  await advanced.locator('[data-colorblind-profile]').getByText('Protanopia', { exact: true }).click();
  await advanced.locator('[data-colorblind-variant]').getByText('Dark', { exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem('keybr.theme') ?? '{}');
    return prefs.colorblindProfile === 'protanopia' && prefs.colorblindVariant === 'dark' && prefs.color === 'custom';
  })).toBe(true);
  await advanced.getByRole('button', { name: 'QA Theme', exact: true }).click();
  await expect(themeName).toHaveValue('QA Theme');
  await expect(background).toHaveValue('#123456');
  await advanced.getByRole('button', { name: 'Delete QA Theme', exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem('keybr.theme') ?? '{}');
    return !prefs.savedThemes?.some(theme => theme.name === 'QA Theme') && !prefs.menuThemes?.some(id => String(id).startsWith('saved:'));
  })).toBe(true);
});

test('custom context menu stays contained and keyboard navigable', async ({ page }, info) => {
  await page.setViewportSize({ width: 128, height: 1000 });
  await visit(page, '/', info);
  const link = page.getByRole('link', { name: /Sanyam Brar.*Home/ }).first();
  await link.focus();
  await link.evaluate(element => element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 126, clientY: 998 })));
  const menu = page.getByRole('menu', { name: 'Context menu' });
  await expect(menu).toBeVisible();
  await expect.poll(async () => {
    const box = await menu.boundingBox(), viewport = page.viewportSize();
    return !!box && box.x >= 7 && box.y >= 7 && box.x + box.width <= viewport.width - 7 && box.y + box.height <= viewport.height - 7;
  }).toBe(true);
  await expect(menu.locator('[role="menuitem"]:not(:disabled)').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(link).toBeFocused();

  const nativeShiftClick = await link.evaluate(element => element.dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true, cancelable: true, shiftKey: true, button: 2, clientX: 12, clientY: 12,
  })));
  expect(nativeShiftClick).toBe(true);
  await expect(menu).not.toBeVisible();
  await link.evaluate(element => element.dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true, cancelable: true, shiftKey: true, button: 0, clientX: 12, clientY: 12,
  })));
  await expect(menu).toBeVisible();
  await page.evaluate(() => dispatchEvent(new Event('resize')));
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(link).toBeFocused();

  await page.setViewportSize({ width: 320, height: 180 });
  await link.focus();
  await page.keyboard.press('Shift+F10');
  await expect(menu).toBeVisible();
  await expect.poll(async () => {
    const box = await menu.boundingBox(), viewport = page.viewportSize();
    return !!box && box.x >= 7 && box.y >= 7 && box.x + box.width <= viewport.width - 7 && box.y + box.height <= viewport.height - 7;
  }).toBe(true);
  const enabledItems = menu.locator('[role="menuitem"]:not(:disabled)');
  await expect(enabledItems.first()).toBeFocused();
  await page.keyboard.press('End');
  await expect(enabledItems.last()).toBeFocused();
  await expect(menu).toBeVisible();
  await expect.poll(() => menu.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press('Home');
  await expect(enabledItems.first()).toBeFocused();
  await expect.poll(() => menu.evaluate(element => element.scrollTop)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(link).toBeFocused();
});

test('Wordle typing, persistence, settings, reveal and statistics', async ({ page }, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'clipboard', {
      configurable: true,
      get: () => ({ writeText: async text => { globalThis.__sameyCopiedChallengeUrl = text; } }),
    });
  });
  await visit(page, '/wordle', info);
  await page.getByRole('button', { name: 'Configure', exact: true }).click();
  await expect(page.locator('.wordle-board')).toBeVisible();
  await page.keyboard.type('planet');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => Object.entries(localStorage).filter(([key]) => key.startsWith('game.wordle.advanced.v2.')).map(([, value]) => JSON.parse(value).history[0][0]).join(''))).toBe('planet');
  const before = await page.locator('.wordle-board').textContent();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.wordle-board')).toHaveText(before);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settingsTrigger = page.getByRole('button', { name: 'Settings', exact: true });
  const settingsDialog = page.getByRole('dialog', { name: 'Game settings' });
  await expect.poll(async () => {
    const trigger = await settingsTrigger.boundingBox(), dialog = await settingsDialog.boundingBox();
    return !!trigger && !!dialog && dialog.y >= trigger.y + trigger.height && dialog.x >= 7 && dialog.x + dialog.width <= page.viewportSize().width - 7;
  }, { message: 'Settings must stay anchored below their trigger and within the viewport' }).toBe(true);
  const fast = page.getByRole('switch', { name: 'Fast Invalidate' });
  await expect(fast).toBeChecked();
  await fast.focus();
  await page.keyboard.press('Space');
  await expect(fast).not.toBeChecked();
  await page.getByRole('slider', { name: 'Max guesses', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('game.wordle.settings.hard')).maxTries)).toBe(7);
  await page.getByRole('button', { name: 'Reveal', exact: true }).click();
  const resultDialog = page.locator('.result-dialog');
  await expect(page.getByText('The answer has been revealed.', { exact: true })).toBeVisible();
  const shareTrigger = page.getByRole('button', { name: 'Share', exact: true });
  await shareTrigger.click();
  const shareDialog = page.getByRole('dialog', { name: 'Share challenge' });
  await expect(shareDialog).toBeVisible();
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  const copiedChallengeUrl = await page.evaluate(() => globalThis.__sameyCopiedChallengeUrl ?? '');
  expect(copiedChallengeUrl).toContain('/wordle?g=');
  expect(copiedChallengeUrl).not.toContain('.html');
  await page.keyboard.press('Escape');
  await expect(shareDialog).not.toBeVisible();
  await expect(resultDialog).toBeVisible();
  await expect(shareTrigger).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(resultDialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Statistics', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Summary', exact: true })).toBeVisible();
  await expect(page.locator('.stats-summary-item').filter({ hasText: 'Games' }).first()).toContainText('1');
  await page.locator('.stats-history-trigger').first().click();
  await expect(page.getByRole('dialog', { name: /^Game details for / })).toBeVisible();
});

test('Wordle on-screen key clears after pointer capture loss', async ({ page }, info) => {
  await visit(page, '/wordle', info);
  await page.getByRole('button', { name: 'Configure', exact: true }).click();
  const key = page.getByRole('button', { name: 'A', exact: true });
  await key.evaluate(element => {
    element.addEventListener('pointerdown', event => {
      globalThis.__sameyQaWordlePointerId = event.pointerId;
    }, { once: true });
  });
  const box = await key.boundingBox();
  if (!box) throw new Error('Wordle A key has no geometry');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(key).toHaveClass(/wordle-key-pressed/);
  await key.evaluate(element => {
    const pointerId = globalThis.__sameyQaWordlePointerId;
    if (typeof pointerId !== 'number' || !element.hasPointerCapture(pointerId)) throw new Error('Wordle key did not capture the pointer');
    element.releasePointerCapture(pointerId);
  });
  await page.mouse.move(box.x + box.width / 2 + 3, box.y + box.height / 2 + 3);
  await expect(key, 'Lost pointer capture must clear the pressed key state').not.toHaveClass(/wordle-key-pressed/);
  await page.mouse.up();
});

test('shared slider drag aborts on window blur', async ({ page }, info) => {
  await visit(page, '/wordle', info);
  await page.getByRole('button', { name: 'Configure', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const slider = page.getByRole('slider', { name: 'Max guesses', exact: true });
  const result = await slider.evaluate(async element => {
    const root = element.closest('.game-settings-slider');
    if (!(root instanceof HTMLElement)) throw new Error('Shared slider root is missing');
    const rect = element.getBoundingClientRect();
    element.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, pointerId: 77, button: 0,
      clientX: rect.left + 20, clientY: rect.top + 5,
    }));
    const draggingBefore = root.hasAttribute('data-samey-slider-dragging');
    window.dispatchEvent(new Event('blur'));
    document.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, pointerId: 77,
      clientX: rect.right - 5, clientY: rect.top + 5,
    }));
    await new Promise(resolve => requestAnimationFrame(resolve));
    return {
      draggingBefore,
      draggingAfter: root.hasAttribute('data-samey-slider-dragging'),
      offset: root.style.getPropertyValue('--samey-slider-drag-offset'),
      fill: root.style.getPropertyValue('--samey-slider-drag-fill'),
    };
  });
  expect(result).toEqual({
    draggingBefore: true,
    draggingAfter: false,
    offset: '',
    fill: '',
  });
});

test('Wordle date picker and daily start', async ({ page }, info) => {
  await visit(page, '/wordle', info);
  await page.getByRole('button', { name: /^Choose date,/ }).click();
  const picker = page.getByRole('dialog', { name: 'Choose date' });
  await expect(picker).toBeVisible();
  await page.setViewportSize({ width: 320, height: 180 });
  await expect.poll(async () => {
    const box = await picker.boundingBox(), viewport = page.viewportSize();
    return !!box && box.x >= 7 && box.y >= 7 && box.x + box.width <= viewport.width - 7 && box.y + box.height <= viewport.height - 7;
  }, { message: 'Date picker must stay inside an extreme short viewport' }).toBe(true);
  await page.keyboard.press('Escape');
  await expect(picker).not.toBeVisible();
  await expect(page.getByRole('button', { name: /^Choose date,/ })).toBeFocused();
  await page.getByRole('button', { name: 'Play', exact: true }).first().click();
  await expect(page.locator('.wordle-board')).toBeVisible();
  await expect(page).toHaveURL(/\?/);
});

test('Wordle active game stays contained at 128px', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, '/wordle', info);
  await page.getByRole('button', { name: 'Configure', exact: true }).click();
  await expect(page.locator('.wordle-board')).toBeVisible();
  await page.setViewportSize({ width: 128, height: 1000 });
  const contained = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1);
  await expect.poll(contained).toBe(true);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Game settings' })).toBeVisible();
  await expect.poll(contained).toBe(true);
});

test('Wordle active games modal owns the overlay and switches saved games', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const put = (length, word, mask) => localStorage.setItem(`game.wordle.advanced.${length}.6.0.0`, JSON.stringify({
      config: { mode: 'advanced', wordLength: length, maxTries: 6, disabledLetters: 0, allowAny: false },
      history: [[word, mask], ['', '']],
    }));
    put(5, 'apple', 'rrrrr');
    put(7, 'example', 'yrrrrrr');
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, '/wordle', info);
  await page.getByRole('button', { name: 'Configure', exact: true }).click();
  await expect(page.locator('.wordle-board')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Active Games', exact: true }).click();
  const activeGames = page.locator('.active-games-dialog');
  await expect(activeGames).toBeVisible();
  await expect(activeGames).toHaveAttribute('aria-modal', 'true');
  await expect(activeGames).toHaveAttribute('aria-label', 'Active games');
  await expect(page.locator('.wordle-settings-popover')).not.toBeVisible();
  const openingFrames = [];
  for (let frame = 0; frame < 10; frame++) {
    const box = await activeGames.boundingBox();
    openingFrames.push(!!box && box.x >= -1 && box.y >= -1 && box.x + box.width <= 391 && box.y + box.height <= 845);
    await page.waitForTimeout(12);
  }
  expect(openingFrames).not.toContain(false);
  await page.keyboard.press('Escape');
  await expect(activeGames).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Active Games', exact: true }).click();
  await expect(activeGames).toBeVisible();
  await page.setViewportSize({ width: 128, height: 1000 });
  await expect.poll(async () => {
    const box = await activeGames.boundingBox();
    return !!box && box.x >= -1 && box.x + box.width <= page.viewportSize().width + 1;
  }).toBe(true);
  await activeGames.locator('.active-game-card').filter({ hasText: '5 letters' }).click();
  await expect(page.locator('.wordle-row').first().locator('.wordle-cell')).toHaveCount(5);
  await page.setViewportSize({ width: 320, height: 180 });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Active Games', exact: true }).click();
  await page.locator('.active-game-card').filter({ hasText: '7 letters' }).click();
  await expect(page.locator('.wordle-row').first().locator('.wordle-cell')).toHaveCount(7);
});

test('Keybr settings persist and typing is live', async ({ page }, info) => {
  await visitKeybr(page, info);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  for (const label of ['Font', 'Sound theme', 'Language', 'Layout', 'Geometry', 'Zones', 'Typing speed unit'])
    await expect(page.getByRole('combobox', { name: label, exact: true })).toBeVisible();
  const speedUnit = page.getByRole('combobox', { name: 'Typing speed unit', exact: true });
  const beforeUnit = await speedUnit.textContent();
  await speedUnit.focus();
  await page.keyboard.press('Enter');
  await expect(speedUnit).toHaveAttribute('aria-expanded', 'true');
  const listboxId = await speedUnit.getAttribute('aria-controls');
  expect(listboxId).toBeTruthy();
  const listbox = page.locator(`#${listboxId}`);
  await expect(listbox).toHaveAttribute('role', 'listbox');
  const activeBefore = await speedUnit.getAttribute('aria-activedescendant');
  expect(activeBefore).toBeTruthy();
  await expect(page.locator(`#${activeBefore}`)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowDown');
  const activeAfter = await speedUnit.getAttribute('aria-activedescendant');
  expect(activeAfter).toBeTruthy();
  expect(activeAfter).not.toBe(activeBefore);
  await expect(page.locator(`#${activeAfter}`)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(speedUnit).toHaveAttribute('aria-expanded', 'false');
  await expect(speedUnit).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(speedUnit).toHaveAttribute('aria-expanded', 'false');
  await expect(speedUnit).not.toHaveText(beforeUnit ?? '');
  const stop = page.getByRole('switch', { name: 'Stop cursor on error' });
  await expect(stop).toBeChecked();
  await stop.focus();
  await page.keyboard.press('Space');
  await expect(stop).not.toBeChecked();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('switch', { name: 'Stop cursor on error' })).not.toBeChecked();
  await page.locator('.keybr-view-back').click();
  await page.keyboard.press('Enter');
  await page.keyboard.type('learn ', { delay: 40 });
  await expect(page.locator('body')).not.toContainText(/Oh no, something bad/);
  await page.getByRole('button', { name: 'Statistics', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Statistics', exact: true })).toBeDisabled();
});

test('Keybr zoomer drag aborts on window blur', async ({ page }, info) => {
  await visitKeybr(page, info);
  const textarea = page.locator('textarea').first();
  await expect(textarea).toBeVisible();
  const zoomer = textarea.locator('xpath=ancestor::div[contains(@style, "transform: scale")][1]');
  const box = await zoomer.boundingBox();
  if (!box) throw new Error('Keybr zoomer has no geometry');
  const position = () => zoomer.evaluate(element => [element.style.left, element.style.top]);

  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + 55);
  await expect.poll(position, { message: 'Keybr zoomer must move while dragging' }).not.toEqual(['0px', '0px']);
  const beforeBlur = await position();

  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.mouse.move(box.x + 140, box.y + 115);
  await page.waitForTimeout(60);
  expect(await position(), 'Keybr zoomer must stop moving after window blur').toEqual(beforeBlur);
  await page.mouse.up();
});

test('Keybr statistics canvases paint and survive resize and theme repaint', async ({ page }, info) => {
  await visitKeybr(page, info);
  await seedKeybrHistory(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Statistics', exact: true }).click();

  const charts = page.locator('figure canvas');
  await expect(charts).toHaveCount(6);
  await expect.poll(() => keybrChartsPainted(page), { message: 'Every Keybr statistics canvas must contain painted pixels' }).toBe(true);

  await page.setViewportSize({ width: 704, height: 900 });
  await expect.poll(() => charts.evaluateAll(canvases => canvases.every(canvas => {
    const ratio = devicePixelRatio;
    return canvas.width === Math.max(1, Math.round(canvas.clientWidth * ratio))
      && canvas.height === Math.max(1, Math.round(canvas.clientHeight * ratio));
  })), { message: 'Canvas backing stores must track their rendered size' }).toBe(true);
  await expect.poll(() => keybrChartsPainted(page), { message: 'Resizing must not clear Keybr statistics canvases' }).toBe(true);

  const canvasChecksum = () => charts.evaluateAll(canvases => canvases.map(canvas => {
    const context = canvas.getContext('2d');
    if (!context) return 0;
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let hash = 2166136261;
    const stride = Math.max(4, Math.floor(data.length / 4096 / 4) * 4);
    for (let i = 0; i < data.length; i += stride) {
      hash ^= data[i] | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }).join(','));

  await page.evaluate(() => globalThis.SameyAppearance.set({ color: 'light' }));
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toContain('light');
  const lightChecksum = await canvasChecksum();
  await page.evaluate(() => globalThis.SameyAppearance.set({ color: 'dark' }));
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toContain('dark');
  await expect.poll(async () => await canvasChecksum() !== lightChecksum, { message: 'Theme changes must repaint chart colors' }).toBe(true);
  await expect.poll(() => keybrChartsPainted(page), { message: 'Theme repaint must keep every statistics canvas visible' }).toBe(true);
});

test('Keybr storybook progress survives reload, preview and book switches', async ({ page }, info) => {
  await visitKeybr(page, info);
  const lessonText = async () => (await page.locator('[data-grab-cursor-on-drag]:has(textarea)').first().locator('div[dir]').allTextContents()).join('').replace(/[·␣]/g, ' ').trim();
  const waitForLesson = async (previous = '') => {
    await expect.poll(async () => {
      const value = await lessonText();
      return value.length > 0 && value !== previous;
    }).toBe(true);
    return lessonText();
  };
  const chooseBook = async (query, name) => {
    await page.getByRole('button', { name: 'Choose book', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Choose a book' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('searchbox').fill(query);
    await dialog.getByRole('button', { name }).click();
    await expect(dialog).not.toBeVisible();
  };
  const openSettings = async () => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('radiogroup', { name: 'Lesson type' })).toBeVisible();
  };
  const closeSettings = async () => {
    await page.locator('.keybr-view-back').click();
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  };

  await openSettings();
  await page.getByRole('radio', { name: 'Books', exact: true }).click();
  await expect(page.locator('[data-keybr-lesson-type="books"]')).toBeVisible();
  await chooseBook('Alice’s Adventures', /Alice’s Adventures in Wonderland.*Lewis Carroll/);
  await closeSettings();

  const aliceFirst = await waitForLesson();
  await page.getByRole('button', { name: 'Skip the current lesson (Ctrl + Right Arrow).', exact: true }).click();
  const aliceSecond = await waitForLesson(aliceFirst);
  const aliceKey = 'game.keybr.storybook.progress.v1.en-alice-wonderland';
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), aliceKey)).not.toBeNull();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect.poll(lessonText).toBe(aliceSecond);
  const beforePreview = await page.evaluate(key => localStorage.getItem(key), aliceKey);
  await openSettings();
  await expect(page.locator('[data-keybr-lesson-type="books"]')).toBeVisible();
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), aliceKey)).toBe(beforePreview);
  await closeSettings();
  await expect.poll(lessonText).toBe(aliceSecond);

  await page.getByRole('button', { name: 'Previous lesson (Ctrl + Left Arrow).', exact: true }).click();
  await expect.poll(lessonText).toBe(aliceFirst);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect.poll(lessonText).toBe(aliceFirst);

  await openSettings();
  await chooseBook('Jekyll', /The Strange Case Of Dr\. Jekyll And Mr\. Hyde.*Robert Louis Stevenson/);
  await closeSettings();
  const jekyllFirst = await waitForLesson();
  await page.getByRole('button', { name: 'Skip the current lesson (Ctrl + Right Arrow).', exact: true }).click();
  const jekyllSecond = await waitForLesson(jekyllFirst);
  const jekyllKey = 'game.keybr.storybook.progress.v1.en-jekyll-hyde';
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), jekyllKey)).not.toBeNull();

  await openSettings();
  await chooseBook('Alice’s Adventures', /Alice’s Adventures in Wonderland.*Lewis Carroll/);
  await closeSettings();
  await expect.poll(lessonText).toBe(aliceFirst);
  await openSettings();
  await chooseBook('Jekyll', /The Strange Case Of Dr\. Jekyll And Mr\. Hyde.*Robert Louis Stevenson/);
  await closeSettings();
  await expect.poll(lessonText).toBe(jekyllSecond);
});

for (const route of ['/', '/wordle', '/tools/?tool=number', '/tools/?tool=diff', '/tools/?tool=markdown', '/blog/posts/btop-mutex']) test(`accessible ${route}`, async ({ page }, info) => {
  await visit(page, route, info);
  if (route === '/tools/?tool=diff') {
    const editContexts = page.locator('.monaco-diff-editor .native-edit-context');
    await expect(editContexts).toHaveCount(2);
    await expect(editContexts.nth(0)).toHaveAttribute('aria-label', 'Original text');
    await expect(editContexts.nth(1)).toHaveAttribute('aria-label', 'Modified text');
  }
  if (route === '/tools/?tool=markdown') {
    const divider = page.locator('.markdown-divider');
    await expect(page.locator('#md-rich[data-ready="true"]')).toBeVisible();
    await expect(divider).toHaveAttribute('aria-valuemin', '20');
    await expect(divider).toHaveAttribute('aria-valuemax', '80');
    await expect(divider).toHaveAttribute('aria-valuenow', /\d/);
    await expect(page.locator('#vditorExportIframe')).toHaveAttribute('title', 'Markdown export preview');
  }
  if (route === '/blog/posts/btop-mutex') {
    await expect(page.locator('.article-route > main pre[tabindex="0"]')).toHaveCount(7);
  }
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
});

test('accessible Keybr practice input', async ({ page }, info) => {
  await visitKeybr(page, info);
  await expect(page.locator('textarea[aria-label="Typing input"]').first()).toBeAttached();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
});

test('muted text keeps contrast on tinted surfaces', async ({ page }, info) => {
  const contrastViolations = async selector => {
    const results = await new AxeBuilder({ page }).include(selector).withRules(['color-contrast']).analyze();
    return results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }));
  };

  await visit(page, '/projects/reverb/', info);
  for (const color of ['light', 'dark']) {
    await page.evaluate(value => globalThis.SameyAppearance?.set({ color: value }), color);
    await expect.poll(() => contrastViolations('.project-detail')).toEqual([]);
  }

  await visit(page, '/wordle', info);
  await page.getByRole('button', { name: /^Choose date,/ }).click();
  for (const color of ['light', 'dark']) {
    await page.evaluate(value => globalThis.SameyAppearance?.set({ color: value }), color);
    await expect.poll(() => contrastViolations('.wordle-date-picker-popover')).toEqual([]);
  }

  for (const [route, selector] of [
    ['/projects/cnn/', '.cnn-demo-section'],
    ['/blog/posts/btop-mutex', '.article-route > main'],
  ]) {
    await visit(page, route, info);
    for (const color of ['light', 'dark']) {
      await page.evaluate(value => globalThis.SameyAppearance?.set({ color: value }), color);
      await expect.poll(() => contrastViolations(selector)).toEqual([]);
    }
  }
});

test('number conversion updates from edited input', async ({ page }, info) => {
  await visit(page, '/tools/?tool=number', info);
  await page.getByRole('textbox', { name: 'Input', exact: true }).fill('1024');
  await expect(page.getByRole('textbox', { name: 'Hexadecimal', exact: true })).toHaveValue('400');
  await page.getByRole('textbox', { name: 'Input', exact: true }).fill('FF');
  await page.getByRole('button', { name: 'Base 16', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Decimal', exact: true })).toHaveValue('255');
  await page.setViewportSize({ width: 128, height: 1000 });
  await expect.poll(() => page.evaluate(() => {
    const tool = document.querySelector('.number-tool');
    const cards = [...document.querySelectorAll('.number-card')];
    const buttons = [...document.querySelectorAll('.number-card > button')];
    return {
      toolContained: !!tool && tool.scrollWidth <= tool.clientWidth + 1,
      cardsContained: cards.every(card => card.scrollWidth <= card.clientWidth + 1),
      buttonsContained: buttons.every(button => {
        const rect = button.getBoundingClientRect();
        return rect.left >= -1 && rect.right <= innerWidth + 1;
      }),
    };
  })).toEqual({ toolContained: true, cardsContained: true, buttonsContained: true });
});

test('Markdown divider drag ends after pointer capture loss', async ({ page }, info) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await visit(page, '/tools/?tool=markdown', info);
  const tool = page.locator('.markdown-tool');
  const divider = page.locator('.markdown-divider');
  await expect(divider).toBeVisible();
  await divider.evaluate(element => {
    element.addEventListener('pointerdown', event => {
      globalThis.__sameyQaMarkdownPointerId = event.pointerId;
    }, { once: true });
  });
  const box = await divider.boundingBox();
  if (!box) throw new Error('Markdown divider has no geometry');
  const initialSplit = await tool.evaluate(element => element.style.getPropertyValue('--md-split'));
  const x = box.x + box.width / 2, y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await divider.evaluate(element => {
    const pointerId = globalThis.__sameyQaMarkdownPointerId;
    if (typeof pointerId !== 'number' || !element.hasPointerCapture(pointerId)) throw new Error('Markdown divider did not capture the pointer');
    element.releasePointerCapture(pointerId);
  });
  await page.mouse.move(x + 120, y);
  await page.mouse.up();

  const fresh = await divider.boundingBox();
  if (!fresh) throw new Error('Markdown divider disappeared after capture loss');
  await page.mouse.move(fresh.x - 80, fresh.y + fresh.height / 2);
  await page.mouse.move(fresh.x + fresh.width - 0.5, fresh.y + fresh.height / 2);
  await expect.poll(() => tool.evaluate(element => element.style.getPropertyValue('--md-split')),
    { message: 'Hovering after capture loss must not continue the old Markdown drag' }).toBe(initialSplit);
});

test('Tools mobile selector dismisses and navigates by keyboard', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, '/tools/?tool=number', info);
  const trigger = page.getByRole('button', { name: /Tool/ });
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
  await trigger.focus();
  await page.keyboard.press('Enter');
  const listbox = page.getByRole('listbox');
  await expect(listbox).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(listbox.getByRole('option', { name: 'Numbers', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(listbox).not.toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(listbox).toBeVisible();
  await expect(listbox.getByRole('option', { name: 'Numbers', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(listbox.getByRole('option', { name: 'Markdown', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/tools\/\?tool=markdown$/);
  await expect(trigger).toContainText('Markdown');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('Chain replay stays usable at extreme sizes and resumes a fork', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('samey.chain.matches.v1', JSON.stringify({
    v: 1, base: { games: 0, wins: 0, largest: 0 },
    matches: [{ id: 'qa-match', t: Date.now() - 1000, u: Date.now(), end: Date.now(), s: 'completed', w: 1, r: 4, c: 4, e: 1, m: [1024, 2063, 1025, 2062], q: true, p: [], parent: '', fork: 0 }],
  })));
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, '/chain/', info);
  await page.getByRole('button', { name: 'Statistics', exact: true }).first().click();
  await page.locator('.chain-stat-row-button').first().click();
  const replay = page.locator('.chain-replay');
  await expect(replay).toBeVisible();
  for (const viewport of [{ width: 128, height: 1000 }, { width: 320, height: 180 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => {
      const box = await replay.boundingBox();
      return !!box && box.x >= -1 && box.x + box.width <= viewport.width + 1;
    }).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.chain-replay-controls output')).toHaveText('Move 1 / 4');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.chain-replay-controls output')).toHaveText('Move 2 / 4');
  await page.getByRole('button', { name: 'Resume from here', exact: true }).click();
  await expect(page.getByRole('grid', { name: /Chain Reaction board/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('samey.chain.matches.v1') ?? '{}');
    const match = db.matches?.[0];
    return match && { parent: match.parent, fork: match.fork, moves: match.m?.length };
  })).toEqual({ parent: 'qa-match', fork: 2, moves: 2 });
  const settings = page.getByRole('button', { name: 'Settings', exact: true });
  await settings.click();
  await page.locator('#chain-settings input[type="range"]').first().focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('#chain-settings')).toHaveAttribute('aria-hidden', 'true');
  await expect(settings).toHaveAttribute('aria-expanded', 'false');
  await expect(settings).toBeFocused();
});

test('Chain completed result owns modal focus', async ({ page }, info) => {
  await page.addInitScript(() => {
    const board = new Uint8Array(16), owners = new Uint8Array(16), entered = new Uint8Array([0, 1, 1]);
    board[0] = owners[0] = 1;
    const encode = values => btoa(String.fromCharCode(...values));
    localStorage.setItem('samey.chain.game.v4', JSON.stringify({ v: 4, id: 'qa-result', pl: [], r: 4, c: 4, e: 1, b: encode(board), o: encode(owners), p: encode(entered), t: 1, g: true, i: true, m: [], q: true }));
  });
  await visit(page, '/chain/?p=game', info);
  const result = page.getByRole('dialog', { name: 'You win' });
  const playAgain = page.getByRole('button', { name: 'Play again', exact: true });
  const gameMenu = page.getByRole('button', { name: 'Game menu', exact: true });
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute('aria-modal', 'true');
  await expect(playAgain).toBeFocused();
  expect(await page.locator('.chain-game-view').evaluate(view => [...view.children].filter(child => !child.classList.contains('chain-result')).every(child => child.inert))).toBe(true);
  await page.keyboard.press('Shift+Tab');
  await expect(gameMenu).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(playAgain).toBeFocused();
  await playAgain.click();
  await expect(result).not.toBeVisible();
  await expect(page.getByRole('grid', { name: /Chain Reaction board/ })).toBeFocused();
  expect(await page.locator('.chain-game-view').evaluate(view => [...view.children].every(child => !child.inert))).toBe(true);
});

test('project source links use Git branding and Reverb exposes F-Droid beside Source', async ({ page }, info) => {
  for (const path of ['/projects/zhtml/', '/projects/reverb/', '/projects/oneserial/', '/projects/cnn/']) {
    await visit(page, path, info);
    const source = page.locator('.project-source-link');
    await expect(source).toHaveCount(1);
    await expect(source).toContainText('Source');
    await expect(source.locator('svg.project-link-icon-git')).toBeVisible();
    await expect(source.locator('svg.project-link-icon-git path')).toHaveAttribute('d', /^M13\.09 23\.549/);

    const fdroid = page.locator('.project-fdroid-link');
    if (path === '/projects/reverb/') {
      await expect(fdroid).toHaveCount(1);
      await expect(fdroid).toContainText('Available on F-Droid');
      await expect(fdroid.locator('svg.project-link-icon-fdroid')).toBeVisible();
      await expect(fdroid.locator('svg.project-link-icon-fdroid path')).toHaveAttribute('d', /^M20\.472 10\.081/);
      await expect(page.locator('.project-action-links')).toHaveCSS('display', 'flex');
      const sourceBox = await source.boundingBox();
      const fdroidBox = await fdroid.boundingBox();
      if (!sourceBox || !fdroidBox) throw new Error('Project action links have no geometry');
      expect(Math.abs(sourceBox.y - fdroidBox.y), 'F-Droid should sit beside Source when the row fits').toBeLessThan(2);

      const demoFdroid = page.locator('.reverb-demo-store-link');
      await expect(demoFdroid.locator('svg.project-link-icon-fdroid')).toBeVisible();
    } else {
      await expect(fdroid).toHaveCount(0);
    }
  }
});

test('Reverb demo preserves the 411x912 reference surface without stretching', async ({ page }, info) => {
  const dimensions = async (host) => host.evaluate(element => {
    const phone = element.shadowRoot?.querySelector('#phone');
    if (!phone) return null;
    const rect = phone.getBoundingClientRect();
    return [rect.width, rect.height];
  });
  const expectReferenceRatio = async (host) => expect.poll(async () => {
    const size = await dimensions(host);
    if (!size) return null;
    return Number((size[0] / size[1]).toFixed(6));
  }).toBe(Number((411 / 912).toFixed(6)));

  await page.setViewportSize({ width: 1440, height: 1100 });
  await visit(page, '/projects/reverb/', info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  await expect.poll(() => dimensions(host)).toEqual([411, 912]);
  await expectReferenceRatio(host);

  const fullscreen = page.getByRole('button', { name: 'Fullscreen demo' });
  await fullscreen.click();
  await expect.poll(() => dimensions(host)).toEqual([411, 912]);
  await expectReferenceRatio(host);
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 390, height: 844 });
  await expectReferenceRatio(host);
  await expect.poll(() => host.evaluate(element => {
    const phone = element.shadowRoot?.querySelector('#phone');
    if (!phone) return false;
    const outer = element.getBoundingClientRect();
    const inner = phone.getBoundingClientRect();
    return inner.width <= outer.width + 1 && inner.height <= outer.height + 1;
  })).toBe(true);

  await fullscreen.click();
  await expectReferenceRatio(host);
  await expect.poll(() => host.evaluate(element => {
    const phone = element.shadowRoot?.querySelector('#phone');
    if (!phone) return false;
    const outer = element.getBoundingClientRect();
    const inner = phone.getBoundingClientRect();
    return inner.width <= outer.width + 1 && inner.height <= outer.height + 1;
  })).toBe(true);
  await page.keyboard.press('Escape');
});

test('Reverb demo mirrors the captured Android state and palette', async ({ page }, info) => {
  await visit(page, '/projects/reverb/', info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blob = host.locator('#blobControl');

  await expect(blob).toHaveAttribute('aria-label', 'Tap to pause capture');
  const initialSeconds = await host.locator('#blobTime').evaluate(element =>
    element.textContent.split(':').map(Number).reduce((total, part) => total * 60 + part, 0));
  expect(initialSeconds).toBeGreaterThanOrEqual(30 * 60);
  expect(initialSeconds).toBeLessThan(30 * 60 + 15);
  await expect(host.locator('#blobSummary')).toContainText('MiB');
  await expect(host.locator('#openIncidents')).toHaveClass(/alert/);

  expect(await host.evaluate(element => {
    const phone = element.shadowRoot?.querySelector('#phone');
    if (!phone) return null;
    const style = getComputedStyle(phone);
    return {
      surface: style.getPropertyValue('--surface').trim(),
      onSurface: style.getPropertyValue('--on-surface').trim(),
      primary: style.getPropertyValue('--primary').trim(),
      primaryContainer: style.getPropertyValue('--primary-container').trim(),
      tertiary: style.getPropertyValue('--tertiary').trim(),
      outlineVariant: style.getPropertyValue('--outline-variant').trim(),
      error: style.getPropertyValue('--error').trim(),
    };
  })).toEqual({
    surface: '#0a0f10',
    onSurface: '#dde7e9',
    primary: '#9ccfd7',
    primaryContainer: '#265a61',
    tertiary: '#c9e2ff',
    outlineVariant: '#404a4b',
    error: '#fa746f',
  });

  await host.locator('#openIncidents').click();
  const incidents = host.locator('.incident-card');
  await expect(incidents).toHaveCount(3);
  await expect(incidents.nth(0)).toContainText('Fri, 18 Sept 2026');
  await expect(incidents.nth(0)).toContainText('Package updated · status 0 · PID 12662');
  await expect(incidents.nth(0)).toHaveClass(/unread/);
  await expect(incidents.nth(1)).toContainText('Thu, 17 Sept 2026');
  await expect(incidents.nth(2)).toContainText('Wed, 16 Sept 2026');
  await incidents.nth(0).focus();
  await page.keyboard.press('Space');
  await expect(incidents.nth(0)).not.toHaveClass(/unread/);
  await host.locator('#incidentsBack').click();
  await expect(host.locator('#openIncidents')).not.toHaveClass(/alert/);

  await host.locator('#openRange').click();
  await expect(host.locator('#rangeStart')).toHaveText('0:00.0');
  const rangeEndSeconds = await host.locator('#rangeEnd').evaluate(element => {
    const parts = element.textContent.split(':').map(Number);
    return parts.reduce((total, part) => total * 60 + part, 0);
  });
  expect(rangeEndSeconds).toBeGreaterThanOrEqual(30 * 60);
  expect(rangeEndSeconds).toBeLessThan(30 * 60 + 15);
  await expect(host.locator('#selectedWaveRect')).toHaveAttribute('x', '0.00');
  await expect(host.locator('#selectedWaveRect')).toHaveAttribute('width', '360.00');
  await expect(host.locator('.wheel-face')).toHaveCount(20);
});

test('Reverb demo stays usable when narrow and fullscreen from a scrolled page', async ({ page }, info) => {
  await page.setViewportSize({ width: 128, height: 1000 });
  await visit(page, '/projects/reverb/', info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  await expect(host).toBeVisible();
  const expectContained = async () => expect.poll(() => host.evaluate(element => {
    const root = element.shadowRoot, phone = root?.querySelector('#phone'), active = root?.querySelector('.screen.active');
    if (!phone || !active) return false;
    const hostRect = element.getBoundingClientRect(), phoneRect = phone.getBoundingClientRect();
    return phoneRect.left >= hostRect.left - 1 && phoneRect.right <= hostRect.right + 1 && phoneRect.top >= hostRect.top - 1 && phoneRect.bottom <= hostRect.bottom + 1 && active.scrollWidth <= active.clientWidth + 1;
  })).toBe(true);
  await expect.poll(() => host.evaluate(element => element.hasAttribute('data-compact-scale'))).toBe(true);
  await expectContained();
  const brand = host.locator('#brandButton');
  const about = host.locator('#aboutSheet');
  const aboutClose = host.locator('#aboutClose');
  const aboutRepo = host.locator('.about-repo');
  await expect(about).toHaveAttribute('aria-hidden', 'true');
  await expect.poll(() => about.evaluate(element => element.inert)).toBe(true);
  await brand.focus();
  await brand.click();
  await expect(about).toHaveAttribute('aria-hidden', 'false');
  await expect.poll(() => about.evaluate(element => element.inert)).toBe(false);
  await expect(aboutClose).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(aboutRepo).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(aboutClose).toBeFocused();
  await page.keyboard.press('Escape');
  await expect.poll(() => host.evaluate(element => element.shadowRoot?.querySelector('#phone')?.classList.contains('about-open'))).toBe(false);
  await expect(about).toHaveAttribute('aria-hidden', 'true');
  await expect.poll(() => about.evaluate(element => element.inert)).toBe(true);
  await expect(brand).toBeFocused();
  await host.evaluate(element => element.shadowRoot?.querySelector('#openRange')?.click());
  await page.setViewportSize({ width: 320, height: 180 });
  await expectContained();
  await host.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
  const fullscreen = page.getByRole('button', { name: 'Fullscreen demo' });
  await fullscreen.click();
  const frame = page.locator('.reverb-demo-frame');
  const exitFullscreen = page.getByRole('button', { name: 'Exit fullscreen demo' });
  await expect.poll(() => frame.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height)];
  })).toEqual([0, 0, 320, 180]);
  await expect(exitFullscreen).toHaveCSS('opacity', '0');
  expect(await page.evaluate(() => [document.body.style.overflow, document.documentElement.style.overflow])).toEqual(['hidden', 'hidden']);
  await expectContained();
  await page.keyboard.press('Escape');
  await expect(frame).not.toHaveClass(/is-fullscreen/);
  await expect(fullscreen).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => [document.body.style.overflow, document.documentElement.style.overflow])).toEqual(['', '']);
});

test('Reverb settings dropdown closes when its geometry changes', async ({ page }, info) => {
  await visit(page, '/projects/reverb/', info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  await host.locator('#openSettings').click();
  const rate = host.locator('.settings-card.dropdown').filter({ hasText: 'Rate' }).first();
  const menu = host.locator('#dropdownMenu');
  await rate.scrollIntoViewIfNeeded();

  await rate.click();
  await expect(menu).toHaveClass(/show/);
  await host.evaluate(element => {
    const body = element.shadowRoot?.querySelector('.settings-body');
    if (body) body.scrollTop += 180;
  });
  await expect(menu).not.toHaveClass(/show/);

  await rate.scrollIntoViewIfNeeded();
  await rate.click();
  await expect(menu).toHaveClass(/show/);
  await page.setViewportSize({ width: 700, height: 700 });
  await expect(menu).not.toHaveClass(/show/);
});

test('Reverb clears interrupted pointer state on blur', async ({ page }, info) => {
  await visit(page, '/projects/reverb/', info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const result = await host.evaluate(element => {
    const root = element.shadowRoot;
    const phone = root?.querySelector('#phone');
    const blob = root?.querySelector('#blobControl');
    const home = root?.querySelector('#homeScreen');
    const settings = root?.querySelector('#settingsScreen');
    if (!(phone instanceof HTMLElement) || !(blob instanceof HTMLElement)
      || !(home instanceof HTMLElement) || !(settings instanceof HTMLElement)) {
      throw new Error('Reverb pointer-state fixture is incomplete');
    }

    blob.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, pointerId: 41, clientX: 200, clientY: 400,
    }));
    const pressedBefore = blob.classList.contains('pressed');
    window.dispatchEvent(new Event('blur'));
    const pressedAfter = blob.classList.contains('pressed');

    const blobRect = blob.getBoundingClientRect();
    const phoneRect = phone.getBoundingClientRect();
    const x = phoneRect.left + phoneRect.width / 2;
    const y = Math.max(phoneRect.top + 5, blobRect.top - 24);
    phone.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, pointerId: 42, clientX: x, clientY: y,
    }));
    window.dispatchEvent(new Event('blur'));
    phone.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, pointerId: 42, clientX: x, clientY: y + 80,
    }));

    return {
      pressedBefore,
      pressedAfter,
      homeActive: home.classList.contains('active'),
      settingsActive: settings.classList.contains('active'),
    };
  });
  expect(result).toEqual({
    pressedBefore: true,
    pressedAfter: false,
    homeActive: true,
    settingsActive: false,
  });
});

test('Reverb cancels incident long press on blur', async ({ page }, info) => {
  await visit(page, '/projects/reverb/', info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  await host.evaluate(element => element.shadowRoot?.querySelector('#openIncidents')?.click());
  const incident = host.locator('.incident-card').first();
  const toast = host.locator('#toast');
  await incident.evaluate(element => {
    element.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, pointerId: 55, clientX: 200, clientY: 350,
    }));
    window.dispatchEvent(new Event('blur'));
  });
  await page.waitForTimeout(650);
  await expect(toast, 'Blur must cancel the pending incident long-press action').not.toHaveClass(/show/);
  await expect(toast).not.toHaveText('Incident copied');
});

test('Reverb blob renderer pauses while its screen is hidden', async ({ page }, info) => {
  await page.addInitScript(() => {
    globalThis.__sameyQaReverbDraws = 0;
    globalThis.__sameyQaRafCallbacks = 0;
    const originalDrawArrays = WebGLRenderingContext.prototype.drawArrays;
    WebGLRenderingContext.prototype.drawArrays = function(...args) {
      globalThis.__sameyQaReverbDraws += 1;
      return originalDrawArrays.apply(this, args);
    };
    const originalRaf = globalThis.requestAnimationFrame.bind(globalThis);
    globalThis.requestAnimationFrame = callback => originalRaf(time => {
      globalThis.__sameyQaRafCallbacks += 1;
      callback(time);
    });
  });
  await visit(page, '/projects/reverb/', info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const drawCount = () => page.evaluate(() => globalThis.__sameyQaReverbDraws ?? 0);
  const rafCount = () => page.evaluate(() => globalThis.__sameyQaRafCallbacks ?? 0);
  const timerSeconds = () => host.locator('#blobTime').evaluate(element =>
    element.textContent.split(':').map(Number).reduce((total, part) => total * 60 + part, 0));
  await expect.poll(drawCount, { message: 'Visible Reverb blob must actively render' }).toBeGreaterThan(0);
  const initialBacking = await host.locator('#blobCanvas').evaluate(canvas => [canvas.width, canvas.height]);

  await host.locator('#openSettings').click();
  await expect(host.locator('#settingsScreen')).toHaveClass(/active/);
  await page.waitForTimeout(80);
  const hiddenDrawCount = await drawCount();
  const hiddenRafCount = await rafCount();
  const hiddenTimer = await timerSeconds();
  await expect.poll(timerSeconds, {
    message: 'Capture time must keep advancing while Settings is open',
    timeout: 3000,
    intervals: [100, 200, 300],
  }).toBeGreaterThan(hiddenTimer);
  expect(await drawCount(), 'Hidden Reverb blob must stop issuing WebGL draws').toBe(hiddenDrawCount);
  expect(await rafCount(), 'Hidden Reverb screen must not keep a frame polling loop alive').toBe(hiddenRafCount);
  expect(await host.locator('#blobCanvas').evaluate(canvas => [canvas.width, canvas.height]),
    'Hiding the blob must not collapse its backing store').toEqual(initialBacking);

  await host.locator('#settingsNav').click();
  await expect(host.locator('#homeScreen')).toHaveClass(/active/);
  await expect.poll(async () => await drawCount() > hiddenDrawCount,
    { message: 'Reverb blob rendering must resume when Home becomes visible' }).toBe(true);
});

test('Reverb demo releases its resize listener after SPA leave', async ({ page }, info) => {
  await page.addInitScript(() => {
    const listeners = new Set();
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    Object.defineProperty(globalThis, '__sameyQaResizeListeners', { value: listeners });
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (this === window && type === 'resize' && listener) listeners.add(listener);
      return add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function(type, listener, options) {
      if (this === window && type === 'resize' && listener) listeners.delete(listener);
      return remove.call(this, type, listener, options);
    };
  });
  await visit(page, '/', info);
  const resizeListenerCount = () => page.evaluate(() => globalThis.__sameyQaResizeListeners?.size ?? -1);
  const baseline = await resizeListenerCount();
  const navigate = async href => {
    const loaded = page.evaluate(() => new Promise(resolve => addEventListener('samey-pageload', () => resolve(true), { once: true })));
    await page.evaluate(next => { void globalThis.SameyNavigate?.(next); }, href);
    await loaded;
  };

  await navigate('/projects/reverb/');
  await expect(page.getByRole('group', { name: 'Interactive Reverb UI demo' })).toBeVisible();
  await expect.poll(resizeListenerCount).toBe(baseline + 1);

  await navigate('/work/');
  await expect(page).toHaveURL(/\/work\/$/);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.siteKind)).toBe('work');
  await expect.poll(resizeListenerCount, { message: 'Reverb runtime resize listener must be removed on unmount' }).toBe(baseline);
});

test('Reverb blob falls back after WebGL context loss', async ({ page }, info) => {
  await visit(page, '/projects/reverb/', info);
  const host = page.getByRole('group', { name: 'Interactive Reverb UI demo' });
  const blobPainted = () => host.evaluate(element => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const canvas = element.shadowRoot?.querySelector('#blobCanvas');
      if (!(canvas instanceof HTMLCanvasElement) || canvas.width <= 0 || canvas.height <= 0) {
        resolve(false);
        return;
      }
      const gl = canvas.getContext('webgl');
      if (gl && !gl.isContextLost()) {
        const data = new Uint8Array(canvas.width * canvas.height * 4);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
        let painted = 0;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] !== 0 && ++painted >= 64) {
            resolve(true);
            return;
          }
        }
        resolve(false);
        return;
      }
      const context = canvas.getContext('2d');
      if (!context) {
        resolve(false);
        return;
      }
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      let painted = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0 && ++painted >= 64) {
          resolve(true);
          return;
        }
      }
      resolve(false);
    }));
  }));
  await expect.poll(blobPainted, { message: 'Reverb WebGL blob must paint before context loss' }).toBe(true);

  const contextLossSupported = await host.evaluate(element => {
    const canvas = element.shadowRoot?.querySelector('#blobCanvas');
    if (!(canvas instanceof HTMLCanvasElement)) return false;
    element.__sameyQaBlobCanvas = canvas;
    const extension = canvas.getContext('webgl')?.getExtension('WEBGL_lose_context');
    if (!extension) return false;
    extension.loseContext();
    return true;
  });
  expect(contextLossSupported).toBe(true);
  await expect.poll(() => host.evaluate(element => {
    const canvas = element.shadowRoot?.querySelector('#blobCanvas');
    return canvas instanceof HTMLCanvasElement
      && canvas !== element.__sameyQaBlobCanvas
      && canvas.getContext('2d') != null;
  }), { message: 'Context loss must replace the dead WebGL canvas with the 2D fallback' }).toBe(true);
  await expect.poll(blobPainted, { message: '2D fallback must remain visibly painted' }).toBe(true);

  await page.evaluate(() => globalThis.SameyAppearance.set({ color: 'light' }));
  await expect.poll(blobPainted).toBe(true);
  await page.evaluate(() => globalThis.SameyAppearance.set({ color: 'dark' }));
  await expect.poll(blobPainted).toBe(true);
  const blobControl = host.locator('#blobControl');
  await blobControl.click();
  await expect(blobControl).toHaveAttribute('aria-label', 'Tap to start capture');
  await expect.poll(blobPainted, { message: 'Paused 2D fallback must remain visible' }).toBe(true);
});

test('CNN intensity, drawing, inference and clear', async ({ page }, info) => {
  await visit(page, '/projects/cnn/', info);
  const canvas = page.locator('.cnn-pad');
  await page.getByRole('slider', { name: 'Drawing intensity' }).focus();
  await page.keyboard.press('Home');
  expect(await canvas.evaluate(element => element.getContext('2d').globalAlpha)).toBeCloseTo(0.1, 2);
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.8, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator('.cnn-prediction')).not.toHaveText('—');
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.locator('.cnn-prediction')).toHaveText('—');
  await expect(page.getByRole('button', { name: 'Clear', exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 128, height: 1000 });
  await expect.poll(() => page.locator('.cnn-demo-shell').evaluate(element => {
    const controls = [...element.querySelectorAll('button,input')];
    return element.scrollWidth <= element.clientWidth + 1 && controls.every(control => {
      const rect = control.getBoundingClientRect();
      return rect.left >= -1 && rect.right <= innerWidth + 1;
    });
  }), { message: 'CNN demo controls must stay usable at 128px' }).toBe(true);
});

test('Keybr completed lesson updates metrics and survives reload', async ({ page }, info) => {
  await visitKeybr(page, info);
  await page.keyboard.press('Enter');
  const area = page.locator('[data-grab-cursor-on-drag]:has(textarea)').first();
  const lesson = (await area.textContent()).replace(/[·␣]/g, ' ').trim();
  await page.keyboard.type(lesson, { delay: 100 });
  const savedResults = () => page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('history', 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('history', 'readonly');
      const count = tx.objectStore('history').count();
      tx.oncomplete = () => { db.close(); resolve(count.result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  }));
  await expect.poll(savedResults).toBe(1);
  await expect(page.locator('body')).toContainText(/Speed:\s*[1-9]\d*\.\d+wpm/);
  const transitionMarkers = await page.evaluate(() => {
    const markers = [...document.querySelectorAll('marker[id]')];
    const paths = [...document.querySelectorAll('path[marker-end]')];
    return {
      markerCount: markers.length,
      uniqueMarkerCount: new Set(markers.map(marker => marker.id)).size,
      pathCount: paths.length,
      pathsOwnMarker: paths.every(path => {
        const id = path.getAttribute('marker-end')?.match(/^url\(#(.+)\)$/)?.[1];
        return !!id && !!path.ownerSVGElement?.querySelector('marker#' + CSS.escape(id));
      }),
    };
  });
  expect(transitionMarkers.markerCount).toBe(2);
  expect(transitionMarkers.uniqueMarkerCount).toBe(2);
  expect(transitionMarkers.pathCount).toBeGreaterThan(0);
  expect(transitionMarkers.pathsOwnMarker).toBe(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect.poll(savedResults).toBe(1);
});

test('Keybr practice metrics stay contained at 128px', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('prefs.practice.tourSeen', 'true'));
  await page.setViewportSize({ width: 128, height: 1000 });
  await visit(page, '/keybr?p=practice', info);
  await expect(page.getByText('Metrics:', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => ({
    documentContained: document.documentElement.scrollWidth <= innerWidth + 1,
    bodyContained: document.body.scrollWidth <= innerWidth + 1,
  }))).toEqual({ documentContained: true, bodyContained: true });
});

test('Keybr settings and book library stay contained at extreme narrow widths', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('prefs.practice.tourSeen', 'true'));
  await page.setViewportSize({ width: 720, height: 1000 });
  await visit(page, '/keybr?p=settings', info);

  const expectContained = async (width, height) => {
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.evaluate(() => ({
      documentContained: document.documentElement.scrollWidth <= innerWidth + 1,
      bodyContained: document.body.scrollWidth <= innerWidth + 1,
      segmentOverflow: [...document.querySelectorAll('.keybr-segmented')]
        .filter(element => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        })
        .some(element => element.scrollWidth > element.clientWidth + 1),
    })), { message: `Keybr layout must stay contained at ${width}x${height}` }).toEqual({
      documentContained: true,
      bodyContained: true,
      segmentOverflow: false,
    });
  };

  await expectContained(128, 1000);
  const rangeWidths = await page.locator('input[type="range"]').evaluateAll(inputs => inputs.flatMap(input => {
    const rect = input.getBoundingClientRect();
    const style = getComputedStyle(input);
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.height > 0 ? [rect.width] : [];
  }));
  expect(rangeWidths.length, 'Guided settings should expose range controls').toBeGreaterThan(0);
  expect(Math.min(...rangeWidths), 'Range controls must remain usable at 128px').toBeGreaterThanOrEqual(40);

  for (const label of ['Guided lessons', 'Common words', 'Books', 'Custom text', 'Source code', 'Numbers']) {
    await page.setViewportSize({ width: 720, height: 1000 });
    await page.getByRole('radio', { name: label, exact: true }).click();
    await expectContained(128, 1000);
    await expectContained(180, 1000);
    await expectContained(240, 900);
  }

  await page.setViewportSize({ width: 720, height: 1000 });
  await page.getByRole('radio', { name: 'Books', exact: true }).click();
  await page.getByRole('button', { name: 'Choose book', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectContained(128, 1000);
  await expectContained(180, 1000);
  await expectContained(240, 900);
  await page.getByPlaceholder('Title or author').fill('gatsby');
  await expect(page.getByText('The Great Gatsby', { exact: true })).toBeVisible();
});

test('Keybr tutorial advances through its content and closes cleanly', async ({ page }, info) => {
  await page.setViewportSize({ width: 180, height: 1000 });
  await visitKeybr(page, info);
  const trigger = page.getByTitle('Show a guided tour with help slides.');
  await trigger.click();
  const portal = page.locator('#keybr-portal');
  const dialog = portal.getByRole('dialog', { name: 'Typing tutorial' });
  const closeTutorial = portal.getByRole('link', { name: 'Close tutorial' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(closeTutorial).toBeFocused();
  expect(await page.locator('#keybr-root').evaluate(root => [...root.children].filter(child => child.id !== 'keybr-portal').every(child => child.inert))).toBe(true);
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByText('Next', { exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(closeTutorial).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(await page.locator('#keybr-root').evaluate(root => [...root.children].every(child => !child.inert))).toBe(true);
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(closeTutorial).toBeFocused();
  let slides = 0;
  while (slides < 12 && await page.evaluate(() => Boolean(document.querySelector('#keybr-portal [data-samey-overlay]')))) {
    slides += 1;
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Tutorial must not widen the page').toBe(true);
    if (slides === 5) {
      for (const viewport of [{ width: 5120, height: 720 }, { width: 720, height: 5120 }, { width: 180, height: 1000 }]) {
        await page.setViewportSize(viewport);
        await expect.poll(async () => {
          const box = await portal.locator('[data-samey-overlay]').boundingBox();
          return !!box && box.x >= -1 && box.y >= -1 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1;
        }, { message: 'Tutorial popup must settle inside extreme aspect ratios' }).toBe(true);
      }

      await page.setViewportSize({ width: 900, height: 400 });
      await page.evaluate(() => scrollTo(0, 0));
      await page.mouse.move(20, 20);
      await page.mouse.wheel(0, 300);
      await expect.poll(() => page.evaluate(() => scrollY), { message: 'Tutorial page must exercise a real scroll' }).toBeGreaterThan(0);
      await expect.poll(() => page.evaluate(() => {
        const portal = document.querySelector('#keybr-portal');
        const slide = portal?.querySelector('[data-tour-anchor]');
        const selector = slide?.getAttribute('data-tour-anchor');
        const anchor = selector ? document.querySelector(selector) : null;
        const spotlight = portal?.firstElementChild?.firstElementChild;
        const marker = spotlight?.lastElementChild;
        if (!(anchor instanceof HTMLElement) || !(marker instanceof HTMLElement)) return false;
        const a = anchor.getBoundingClientRect(), m = marker.getBoundingClientRect();
        return Math.abs(m.left - (a.left - 10)) <= 1
          && Math.abs(m.top - (a.top - 10)) <= 1
          && Math.abs(m.width - (a.width + 20)) <= 1
          && Math.abs(m.height - (a.height + 20)) <= 1;
      }), { message: 'Tutorial spotlight must follow its anchor while the page scrolls' }).toBe(true);
    }
    const next = portal.getByText('Next', { exact: true });
    if (await next.count()) {
      await next.click();
      continue;
    }
    const close = portal.getByText('Close', { exact: true });
    if (await close.count()) {
      await close.click();
      continue;
    }
    throw new Error(`Tutorial slide ${slides} has no Next or Close action`);
  }
  expect(slides, 'Tutorial should not terminate before its known introductory content').toBeGreaterThanOrEqual(4);
  await expect.poll(() => page.evaluate(() => Boolean(document.querySelector('#keybr-portal [data-samey-overlay]')))).toBe(false);
  await expect(trigger).toBeFocused();
  expect(await page.locator('#keybr-root').evaluate(root => [...root.children].every(child => !child.inert))).toBe(true);
});
