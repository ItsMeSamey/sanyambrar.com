import { test, expect } from '@playwright/test';
import { exerciseGameContextMenu } from './afterimage-contextmenu-scenarios.mjs';

for (const game of ['reaction', 'cps', 'aim', 'visual', 'sequence', 'sequence-fresh', 'reverse', 'reverse-fresh', 'chimp', 'number-order', 'pairs', 'number', 'verbal', 'arithmetic', 'stroop', 'rotation', 'patterns', 'search', 'paper-folding', 'deduction', 'colour-match']) {
  test(`${game} owns gameplay context menus and preserves page menus`, async ({ page }, info) => {
    test.skip(info.project.metadata.development, 'Afterimage has its own development entry.');
    test.setTimeout(60000);
    await page.addInitScript(() => sessionStorage.removeItem('afterimage-navigation-v1'));
    await page.goto(`http://127.0.0.1:${info.project.metadata.port}/afterimage/`, { waitUntil: 'networkidle' });
    await expect(page.locator(`[data-game-card="${game}"]`)).toBeVisible();
    expect(await page.evaluate(exerciseGameContextMenu, game)).toEqual({ game, passed: true });
  });
}
