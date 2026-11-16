import { test, expect } from '@playwright/test';
import { exerciseNumberOrderClock } from './afterimage-number-order-scenarios.mjs';

test('Number Order times from Start, includes time before 1 and cancels interrupted runs', async ({ page }, info) => {
  test.skip(info.project.metadata.development, 'Afterimage has its own development entry.');
  await page.addInitScript(() => sessionStorage.removeItem('afterimage-navigation-v1'));
  await page.goto(`http://127.0.0.1:${info.project.metadata.port}/afterimage/`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-game-card="number-order"]')).toBeVisible();
  expect(await page.evaluate(exerciseNumberOrderClock)).toEqual({ game: 'number-order', passed: true });
});
