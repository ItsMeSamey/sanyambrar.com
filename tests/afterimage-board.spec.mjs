import { test, expect } from '@playwright/test';
import { exerciseBoardStability } from './afterimage-board-scenarios.mjs';

for (const viewport of [{ width: 320, height: 700 }, { width: 240, height: 540 }, { width: 740, height: 360 }]) {
  for (const game of ['visual', 'sequence', 'sequence-fresh', 'reverse', 'reverse-fresh', 'chimp', 'number-order', 'pairs']) {
    test(`${game} preserves board geometry and final board review at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
      test.skip(info.project.metadata.development, 'Afterimage has its own development entry.');
      await page.setViewportSize(viewport);
      await page.addInitScript(() => sessionStorage.removeItem('afterimage-navigation-v1'));
      await page.goto(`http://127.0.0.1:${info.project.metadata.port}/afterimage/`, { waitUntil: 'networkidle' });
      await expect(page.locator(`[data-game-card="${game}"]`)).toBeVisible();
      const result = await page.evaluate(exerciseBoardStability, game);
      expect(result.passed).toBe(true);
      expect(result.geometry).toBe(true);
    });
  }
}
