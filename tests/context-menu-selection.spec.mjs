import { test, expect } from '@playwright/test';

async function setup(page, info) {
  const meta = info.project.metadata;
  await page.goto(`http://127.0.0.1:${meta.development ? meta.sitePort : meta.port}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#samey-context-menu'));
  await page.evaluate(() => {
    const host = document.createElement('section');
    host.id = 'clipboard-qa';
    host.innerHTML = '<p id="qa-text">before QA_COPY_MARKER after</p><input id="qa-input" value="before QA_INPUT_MARKER after"><div id="qa-editor" contenteditable="true">before <b>QA_EDITABLE_MARKER</b> after</div><input id="qa-readonly" readonly><input id="qa-password" type="password" value="QA_NOT_SECRET"><input id="qa-number" type="number" value="123">';
    host.style.cssText = 'position:fixed;inset:0;background:var(--site-bg);padding:12px;z-index:50;overflow:auto';
    document.body.append(host);
    window.qaWrites = [];
    window.qaMode = 'success';
    window.qaLegacyCopy = document.execCommand.bind(document);
    document.execCommand = () => false;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText(text) {
        window.qaWrites.push(text);
        if (window.qaMode === 'failure') return Promise.reject(Error('QA clipboard rejected'));
        if (window.qaMode === 'pending') return new Promise(resolve => { window.qaComplete = resolve; });
        return Promise.resolve();
      },
      readText: async () => 'QA_PASTE_MARKER',
    } });
    document.querySelector('#qa-readonly').addEventListener('paste', event => {
      event.preventDefault(); event.currentTarget.value = event.clipboardData.getData('text/plain');
    });
  });
}
async function selectAndOpen(page, id, start, end) {
  await page.evaluate(({ id, start, end }) => {
    const element = document.getElementById(id);
    element.focus();
    if (element instanceof HTMLInputElement) element.setSelectionRange(start, end, 'backward');
    else {
      const node = element.querySelector('b')?.firstChild ?? element.firstChild;
      getSelection().setBaseAndExtent(node, end, node, start);
    }
    element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 20, clientY: 20 }));
  }, { id, start, end });
}
const menu = page => page.getByRole('menu', { name: 'Context menu' });
const feedback = page => page.locator('.samey-copy-feedback .samey-toast');

test('selected page text gets only icon actions, correct copy, preserved range and visible success', async ({ page }, info) => {
  await setup(page, info);
  await selectAndOpen(page, 'qa-text', 7, 21);
  await expect(menu(page).getByRole('menuitem')).toHaveCount(3);
  await expect(menu(page).getByRole('menuitem', { name: 'Copy', exact: true })).toHaveAttribute('title', /Copy/);
  expect(await menu(page).locator('button svg').count()).toBe(3);
  await menu(page).getByRole('menuitem', { name: 'Copy', exact: true }).click();
  await expect(feedback(page)).toHaveText('Copied');
  expect(await page.evaluate(() => window.qaWrites)).toEqual(['QA_COPY_MARKER']);
  expect(await page.evaluate(() => getSelection().toString())).toBe('QA_COPY_MARKER');
});

test('input and rich editable Cut remove only the original selected text', async ({ page }, info) => {
  await setup(page, info);
  for (const [id, start, end, value] of [['qa-input', 7, 22, 'QA_INPUT_MARKER'], ['qa-editor', 0, 18, 'QA_EDITABLE_MARKER']]) {
    await selectAndOpen(page, id, start, end);
    await menu(page).getByRole('menuitem', { name: 'Cut', exact: true }).click();
    await expect(feedback(page)).toHaveText('Cut and copied');
    expect(await page.evaluate(id => { const element = document.getElementById(id); return element.value ?? element.textContent; }, id)).toBe('before  after');
    expect(await page.evaluate(() => window.qaWrites.at(-1))).toBe(value);
  }
});

test('native legacy clipboard copy preserves a modal input selection through keyboard Cut', async ({ page }, info) => {
  await setup(page, info);
  await page.evaluate(() => {
    document.execCommand = (...args) => { const result = window.qaLegacyCopy(...args); window.qaLegacySucceeded = result; return result; };
    const dialog = document.createElement('dialog');
    dialog.innerHTML = '<input id="qa-modal-input" value="QA_MODAL_CUT_MARKER">';
    document.body.append(dialog); dialog.showModal();
  });
  await page.locator('#qa-modal-input').focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Shift+F10');
  await expect(menu(page).getByRole('menuitem', { name: 'Copy', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(feedback(page)).toHaveText('Cut and copied');
  await expect(page.locator('#qa-modal-input')).toHaveValue('');
  await expect(page.locator('#qa-modal-input')).toBeFocused();
  expect(await page.evaluate(() => window.qaLegacySucceeded)).toBe(true);
  expect(await page.evaluate(() => window.qaWrites)).toEqual([]);
});

test('denied copy and changed selection during deferred Cut never remove text or report Cut success', async ({ page }, info) => {
  await setup(page, info);
  await page.evaluate(() => { window.qaMode = 'failure'; });
  await selectAndOpen(page, 'qa-input', 7, 22);
  await menu(page).getByRole('menuitem', { name: 'Copy', exact: true }).click();
  await expect(feedback(page)).toContainText('Could not copy');
  await expect(feedback(page)).toHaveAttribute('data-variant', 'error');
  await page.evaluate(() => { window.qaMode = 'pending'; });
  await selectAndOpen(page, 'qa-input', 7, 22);
  await menu(page).getByRole('menuitem', { name: 'Cut', exact: true }).click();
  await page.evaluate(() => { document.querySelector('#qa-input').setSelectionRange(0, 6); window.qaComplete(); });
  await expect(feedback(page)).toContainText('nothing was cut');
  await expect(page.locator('#qa-input')).toHaveValue('before QA_INPUT_MARKER after');
});

test('readonly custom paste is dispatched, and password/non-text mouse and keyboard menus stay native', async ({ page }, info) => {
  await setup(page, info);
  await selectAndOpen(page, 'qa-readonly', 0, 0);
  await menu(page).getByRole('menuitem', { name: 'Paste', exact: true }).click();
  await expect(page.locator('#qa-readonly')).toHaveValue('QA_PASTE_MARKER');
  for (const id of ['qa-password', 'qa-number']) {
    expect(await page.evaluate(id => {
      const element = document.getElementById(id); element.focus();
      const context = element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      const keyboard = element.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true, cancelable: true }));
      return { context, keyboard };
    }, id)).toEqual({ context: true, keyboard: true });
    await expect(menu(page)).not.toBeVisible();
  }
});

test('late page selection replaces the general menu and uses page text despite unrelated input focus', async ({ page }, info) => {
  await setup(page, info);
  await page.evaluate(() => {
    const field = document.querySelector('#qa-input'); field.focus(); field.setSelectionRange(7, 22);
    getSelection().removeAllRanges();
    document.querySelector('#qa-text').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 20, clientY: 20 }));
  });
  await expect(menu(page)).toHaveAttribute('data-compact', 'false');
  await page.evaluate(() => {
    const node = document.querySelector('#qa-text').firstChild;
    getSelection().setBaseAndExtent(node, 7, node, 21);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await expect(menu(page)).toHaveAttribute('data-compact', 'true');
  await menu(page).getByRole('menuitem', { name: 'Copy', exact: true }).click();
  expect(await page.evaluate(() => window.qaWrites)).toEqual(['QA_COPY_MARKER']);
});

test('compact menu fits narrow screens and supports arrows, Escape and Tab focus restoration', async ({ page }, info) => {
  await setup(page, info);
  await page.setViewportSize({ width: 128, height: 180 });
  await selectAndOpen(page, 'qa-input', 7, 22);
  await expect(menu(page).getByRole('menuitem', { name: 'Copy', exact: true })).toBeFocused();
  const rect = await menu(page).boundingBox();
  expect(rect.x).toBeGreaterThanOrEqual(8); expect(rect.x + rect.width).toBeLessThanOrEqual(120);
  expect(rect.y).toBeGreaterThanOrEqual(8); expect(rect.y + rect.height).toBeLessThanOrEqual(172);
  await page.keyboard.press('ArrowRight');
  await expect(menu(page).getByRole('menuitem', { name: 'Cut', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#qa-input')).toBeFocused();
  expect(await page.locator('#qa-input').evaluate(element => [element.selectionStart, element.selectionEnd, element.selectionDirection])).toEqual([7, 22, 'backward']);
  await selectAndOpen(page, 'qa-input', 7, 22);
  await page.keyboard.press('Tab');
  await expect(menu(page)).not.toBeVisible();
  await expect(page.locator('#qa-editor')).toBeFocused();
});

test('visual viewport keyboard/pinch bounds resize the menu without moving a held pointer target', async ({ page }, info) => {
  await page.addInitScript(() => {
    window.qaViewport = Object.assign(new EventTarget(), { width: 390, height: 180, offsetLeft: 0, offsetTop: 40, scale: 1 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: window.qaViewport });
  });
  await setup(page, info);
  await selectAndOpen(page, 'qa-input', 7, 22);
  const initial = await menu(page).boundingBox();
  expect(initial.y).toBeGreaterThanOrEqual(48);
  expect(initial.y + initial.height).toBeLessThanOrEqual(212);
  await page.evaluate(() => {
    document.querySelector('#samey-context-menu button').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 73, bubbles: true }));
    Object.assign(window.qaViewport, { width: 128, height: 80, offsetLeft: 30, offsetTop: 100, scale: 2 });
    window.qaViewport.dispatchEvent(new Event('resize'));
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await menu(page).boundingBox()).toEqual(initial);
  await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 73, bubbles: true })));
  await expect.poll(async () => {
    const rect = await menu(page).boundingBox();
    return rect.x >= 38 && rect.y >= 108 && rect.x + rect.width <= 150 && rect.y + rect.height <= 172;
  }).toBe(true);
  await expect(menu(page).getByRole('menuitem', { name: 'Copy', exact: true })).toBeFocused();
});
