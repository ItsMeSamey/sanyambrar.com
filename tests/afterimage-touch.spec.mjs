import { test, expect } from '@playwright/test';
import { exerciseOverlappingInput, exerciseResultGate } from './afterimage-touch-scenarios.mjs';

for (const game of ['visual', 'sequence', 'sequence-fresh', 'reverse', 'reverse-fresh', 'chimp', 'number-order', 'pairs', 'cps', 'aim', 'verbal', 'number', 'arithmetic', 'rotation', 'patterns', 'stroop', 'search']) {
  test(`${game} accepts overlapping touch presses without replaying or losing actions`, async ({ page }, info) => {
    test.skip(info.project.metadata.development, 'Afterimage has its own development entry.');
    await page.addInitScript(() => sessionStorage.removeItem('afterimage-navigation-v1'));
    await page.goto(`http://127.0.0.1:${info.project.metadata.port}/afterimage/`, { waitUntil: 'networkidle' });
    await expect(page.locator(`[data-game-card="${game}"]`)).toBeVisible();
    expect(await page.evaluate(exerciseOverlappingInput, game)).toEqual({ game, passed: true });
  });
}

test('result delay and held fingers protect replay and same-frame header restart', async ({ page }, info) => {
  test.skip(info.project.metadata.development, 'Afterimage has its own development entry.');
  await page.addInitScript(() => sessionStorage.removeItem('afterimage-navigation-v1'));
  await page.goto(`http://127.0.0.1:${info.project.metadata.port}/afterimage/`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-game-card="number-order"]')).toBeVisible();
  expect(await page.evaluate(exerciseResultGate)).toEqual({ game: 'result-gate', passed: true });
});
