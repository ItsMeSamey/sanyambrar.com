import { test, expect } from '@playwright/test';
import { exerciseKeyboardOwnership } from './afterimage-keyboard-scenarios.mjs';

for (const game of ['rotation', 'patterns', 'stroop', 'search', 'arithmetic', 'number-order', 'pairs']) {
  test(`${game} keyboard controls yield to overlays, consumed events and browser shortcuts`, async ({ page }, info) => {
    test.skip(info.project.metadata.development, 'Afterimage has its own development entry.');
    await page.addInitScript(() => sessionStorage.removeItem('afterimage-navigation-v1'));
    await page.goto(`http://127.0.0.1:${info.project.metadata.port}/afterimage/`, { waitUntil: 'networkidle' });
    await expect(page.locator(`[data-game-card="${game}"]`)).toBeVisible();
    expect(await page.evaluate(exerciseKeyboardOwnership, game)).toEqual({ game, passed: true });
  });
}
