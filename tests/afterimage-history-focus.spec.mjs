import { test, expect } from '@playwright/test';

test('history transfer returns focus to its opener after Escape and Close', async ({ page }, info) => {
  test.skip(info.project.metadata.development, 'Afterimage has its own development entry.');
  await page.goto(`http://127.0.0.1:${info.project.metadata.port}/afterimage/`, { waitUntil: 'networkidle' });
  const opener = page.getByRole('button', { name: 'Import or export history', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Keep your history', exact: true });
  const close = page.getByRole('button', { name: 'Close history transfer', exact: true });

  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveClass(/(?:^|\s)samey-dialog(?:\s|$)/);
  await expect(dialog).toHaveClass(/(?:^|\s)ai-transfer(?:\s|$)/);
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Import history', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Export history', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await close.click();
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test('history transfer has an opaque centered surface within narrow and short viewports', async ({ page }, info) => {
  test.skip(info.project.metadata.development, 'Afterimage has its own development entry.');
  await page.goto(`http://127.0.0.1:${info.project.metadata.port}/afterimage/`, { waitUntil: 'networkidle' });
  const opener = page.getByRole('button', { name: 'Import or export history', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Keep your history', exact: true });
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS('opacity', '1');

  for (const viewport of [{ width: 320, height: 640 }, { width: 320, height: 280 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    const surface = await dialog.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, background: style.backgroundColor, overflowY: style.overflowY };
    });
    expect(surface.x).toBeGreaterThanOrEqual(13);
    expect(surface.y).toBeGreaterThanOrEqual(13);
    expect(surface.x + surface.width).toBeLessThanOrEqual(viewport.width - 13);
    expect(surface.y + surface.height).toBeLessThanOrEqual(viewport.height - 13);
    expect(Math.abs(surface.x + surface.width / 2 - viewport.width / 2)).toBeLessThan(1);
    expect(Math.abs(surface.y + surface.height / 2 - viewport.height / 2)).toBeLessThan(1);
    expect(surface.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(surface.background).not.toBe('transparent');
    expect(surface.overflowY).toBe('auto');
  }
});

async function openSeededVisualHistory(page, info) {
  const current = Array.from({ length: 35 }, (_, index) => ({ value: index + 1, date: Date.UTC(2026, 10, 1, 12, index) }));
  const previous = [4, 8, 12].map((value, index) => ({ value, date: Date.UTC(2026, 9, 1, 12, index) }));
  await page.addInitScript(({ current, previous }) => {
    sessionStorage.removeItem('afterimage-navigation-v1');
    localStorage.setItem('afterimage-history-visual-v3-standard', JSON.stringify(current));
    localStorage.setItem('afterimage-history-visual-v2-standard', JSON.stringify(previous));
  }, { current, previous });
  await page.goto(`http://127.0.0.1:${info.project.metadata.port}/afterimage/`, { waitUntil: 'networkidle' });
  await page.locator('[data-game-card="visual"]').click();
  await expect(page.locator('.ai-history-chart')).toBeVisible();
}

test('history keyboard controls inspect the latest 30 runs and activate detail buttons normally', async ({ page }, info) => {
  test.skip(info.project.metadata.development, 'Afterimage has its own development entry.');
  await openSeededVisualHistory(page, info);
  const chart = page.locator('.ai-history-chart');
  const detail = page.locator('.ai-point-detail');
  const previous = page.getByRole('button', { name: 'Previous run', exact: true });
  const next = page.getByRole('button', { name: 'Next run', exact: true });
  const close = page.getByRole('button', { name: 'Close details', exact: true });

  await chart.focus();
  await page.keyboard.press('Home');
  await expect(detail).toContainText('Run 6:');
  await expect(previous).toBeDisabled();
  await expect(chart.locator('.ai-chart-selection')).toBeVisible();
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(detail).toContainText('Run 7:');
  await previous.focus();
  await page.keyboard.press('Space');
  await expect(detail).toContainText('Run 6:');

  await chart.focus();
  await page.keyboard.press('End');
  await expect(detail).toContainText('Run 35:');
  await expect(next).toBeDisabled();
  await previous.focus();
  await page.keyboard.press('Enter');
  await expect(detail).toContainText('Run 34:');
  await close.focus();
  await page.keyboard.press('Enter');
  await expect(detail).toHaveCount(0);
  await expect(chart).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(detail).toContainText('Run 35:');
  await close.focus();
  await page.keyboard.press('Space');
  await expect(detail).toHaveCount(0);
  await expect(chart).toBeFocused();
  await expect(chart.locator('.ai-chart-selection')).toHaveCount(0);
});

test('switching history formats restores each selected run', async ({ page }, info) => {
  test.skip(info.project.metadata.development, 'Afterimage has its own development entry.');
  await openSeededVisualHistory(page, info);
  const chart = page.locator('.ai-history-chart');
  const detail = page.locator('.ai-point-detail');
  const results = page.getByRole('combobox', { name: 'Results', exact: true });
  const chooseFormat = async scope => {
    // A native select receives pointerdown before its change event.
    await results.dispatchEvent('pointerdown', { pointerType: 'mouse', button: 0 });
    await results.selectOption(scope);
  };

  await chart.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(detail).toContainText('Run 8:');
  await chooseFormat('visual-v2-standard');
  await expect(detail).toHaveCount(0);
  await chart.focus();
  await page.keyboard.press('End');
  await expect(detail).toContainText('Run 3:');
  await expect(detail).toContainText('12 levels');
  await chooseFormat('visual-v3-standard');
  await expect(detail).toContainText('Run 8:');
  await expect(detail).toContainText('8 levels');
  await chooseFormat('visual-v2-standard');
  await expect(detail).toContainText('Run 3:');
});

test('history labels retain readable native sizes at 280 and 320 pixels', async ({ page }, info) => {
  test.skip(info.project.metadata.development, 'Afterimage has its own development entry.');
  await openSeededVisualHistory(page, info);
  const chart = page.locator('.ai-history-chart');
  for (const width of [280, 320]) {
    await page.setViewportSize({ width, height: 640 });
    await chart.scrollIntoViewIfNeeded();
    await expect.poll(() => chart.evaluate(element => Math.abs(element.getBoundingClientRect().width - element.viewBox.baseVal.width))).toBeLessThan(1);
    const geometry = await chart.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return {
        x: bounds.x,
        right: bounds.right,
        labels: [...element.querySelectorAll('text')].map(label => {
          const matrix = label.getScreenCTM();
          const rect = label.getBoundingClientRect();
          return {
            size: parseFloat(getComputedStyle(label).fontSize) * Math.hypot(matrix.a, matrix.b),
            x: rect.x,
            right: rect.right,
          };
        }),
      };
    });
    expect(geometry.x).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(width);
    expect(geometry.labels.length).toBeGreaterThan(2);
    for (const label of geometry.labels) {
      expect(label.size).toBeGreaterThanOrEqual(9.5);
      expect(label.x).toBeGreaterThanOrEqual(geometry.x - 1);
      expect(label.right).toBeLessThanOrEqual(geometry.right + 1);
    }
    expect(await page.locator('.ai-chart-detail-slot').evaluate(element => parseFloat(getComputedStyle(element).minHeight))).toBeGreaterThanOrEqual(70);
  }
});

test('touch selects the nearest run from empty plot space', async ({ page }, info) => {
  test.skip(info.project.metadata.development || !info.project.use.hasTouch, 'Uses the production touch viewport.');
  await openSeededVisualHistory(page, info);
  await page.setViewportSize({ width: 320, height: 640 });
  const chart = page.locator('.ai-history-chart');
  await chart.scrollIntoViewIfNeeded();
  await expect.poll(() => chart.evaluate(element => Math.abs(element.getBoundingClientRect().width - element.viewBox.baseVal.width))).toBeLessThan(1);
  const point = await chart.evaluate(element => {
    const positions = [...element.querySelectorAll('.ai-chart-point')];
    const chosen = positions[12];
    const following = positions[13];
    const x = Number(chosen.getAttribute('cx')) * 0.7 + Number(following.getAttribute('cx')) * 0.3;
    const position = new DOMPoint(x, 32).matrixTransform(element.getScreenCTM());
    return { x: position.x, y: position.y };
  });
  await page.touchscreen.tap(point.x, point.y);
  await expect(page.locator('.ai-point-detail')).toContainText('Run 18:');
  await expect(page.locator('.ai-point-detail')).toContainText('18 levels');
  await expect(chart.locator('.ai-chart-selection')).toBeVisible();
});
