import { test, expect } from '@playwright/test';
import { exerciseNavigationWordmark } from './afterimage-navigation-scenarios.mjs';

test('Afterimage wordmark preserves library history and native modified clicks', async ({ page }, info) => {
  test.skip(info.project.metadata.development, 'Afterimage has its own development entry.');
  await page.addInitScript(() => sessionStorage.removeItem('afterimage-navigation-v1'));
  await page.goto(`http://127.0.0.1:${info.project.metadata.port}/afterimage/`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-game-card="visual"]')).toBeVisible();
  expect(await page.evaluate(exerciseNavigationWordmark)).toEqual({ primaryClicks: 3, modifiedClicks: 5, addedLibraryEntries: 1 });
});
