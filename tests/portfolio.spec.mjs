import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const errors = [], warnings = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
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
  await visit(page, '/keybr.html', info);
}

const routes = ['/', '/work/', '/projects/reverb/', '/projects/cnn/', '/tools/?tool=text', '/tools/?tool=base', '/tools/?tool=diff', '/tools/?tool=number', '/tools/?tool=markdown', '/blog/', '/blog/posts/btop-mutex.html', '/wordle.html', '/keybr.html', '/chain/'];
for (const route of routes) test(`renders ${route}`, async ({ page }, info) => {
  await visit(page, route, info);
  await expect(page.locator('body')).not.toHaveText('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal page overflow').toBe(true);
  expect(await page.title()).not.toBe('');
});

test('search, SPA navigation, history and theme', async ({ page }, info) => {
  await visit(page, '/', info);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByPlaceholder('Search games, tools, writing, work…').fill('CNN');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/projects\/cnn/);
  await expect(page.getByRole('heading', { name: 'CNN', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Games', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.locator('[data-theme-choice="dark"]').click();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toContain('dark');
  await page.keyboard.press('Escape');
});

test('Wordle typing, persistence, settings, reveal and statistics', async ({ page }, info) => {
  await visit(page, '/wordle.html', info);
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
  await expect(page.getByText('The answer has been revealed.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close result', exact: true }).click();
  await page.getByRole('button', { name: 'Statistics', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Summary', exact: true })).toBeVisible();
  await expect(page.locator('.stats-summary-item').filter({ hasText: 'Games' }).first()).toContainText('1');
});

test('Wordle date picker and daily start', async ({ page }, info) => {
  await visit(page, '/wordle.html', info);
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
  await visit(page, '/wordle.html', info);
  await page.getByRole('button', { name: 'Configure', exact: true }).click();
  await expect(page.locator('.wordle-board')).toBeVisible();
  await page.setViewportSize({ width: 128, height: 1000 });
  const contained = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1);
  await expect.poll(contained).toBe(true);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Game settings' })).toBeVisible();
  await expect.poll(contained).toBe(true);
});

test('Keybr settings persist and typing is live', async ({ page }, info) => {
  await visitKeybr(page, info);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
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

test('Keybr storybook progress survives reload, preview and book switches', async ({ page }, info) => {
  await visitKeybr(page, info);
  const lessonText = async () => (await page.locator('[data-grab-cursor-on-drag]:has(textarea)').first().locator('div[dir]').allTextContents()).join('').replace(/[·␣]/g, ' ').trim();
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

  const aliceFirst = await lessonText();
  await page.getByRole('button', { name: 'Skip the current lesson (Ctrl + Right Arrow).', exact: true }).click();
  await expect.poll(lessonText).not.toBe(aliceFirst);
  const aliceSecond = await lessonText();
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
  const jekyllFirst = await lessonText();
  await page.getByRole('button', { name: 'Skip the current lesson (Ctrl + Right Arrow).', exact: true }).click();
  await expect.poll(lessonText).not.toBe(jekyllFirst);
  const jekyllSecond = await lessonText();
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

for (const route of ['/', '/wordle.html', '/tools/?tool=number']) test(`accessible ${route}`, async ({ page }, info) => {
  await visit(page, route, info);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
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
  await host.evaluate(element => element.shadowRoot?.querySelector('#openRange')?.click());
  await page.setViewportSize({ width: 320, height: 180 });
  await expectContained();
  await host.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Fullscreen demo' }).click();
  await expect.poll(() => page.locator('.reverb-demo-frame').evaluate(frame => {
    const rect = frame.getBoundingClientRect();
    return [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height)];
  })).toEqual([0, 0, 320, 180]);
  await expectContained();
  await page.getByRole('button', { name: 'Exit fullscreen demo' }).click();
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
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect.poll(savedResults).toBe(1);
});

test('Keybr practice metrics stay contained at 128px', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('prefs.practice.tourSeen', 'true'));
  await page.setViewportSize({ width: 128, height: 1000 });
  await visit(page, '/keybr.html?p=practice', info);
  await expect(page.getByText('Metrics:', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => ({
    documentContained: document.documentElement.scrollWidth <= innerWidth + 1,
    bodyContained: document.body.scrollWidth <= innerWidth + 1,
  }))).toEqual({ documentContained: true, bodyContained: true });
});

test('Keybr settings and book library stay contained at extreme narrow widths', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('prefs.practice.tourSeen', 'true'));
  await page.setViewportSize({ width: 720, height: 1000 });
  await visit(page, '/keybr.html?p=settings', info);

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
  await visit(page, '/keybr.html', info);
  const portal = page.locator('#keybr-portal');
  await expect(portal.locator('[data-samey-overlay]')).toBeVisible();
  let slides = 0;
  while (slides < 12 && await page.evaluate(() => Boolean(document.querySelector('#keybr-portal [data-samey-overlay]')))) {
    slides += 1;
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Tutorial must not widen the page').toBe(true);
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
});
