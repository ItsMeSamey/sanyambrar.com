import { test, expect } from '@playwright/test';
import { exerciseBoardStability } from './afterimage-board-scenarios.mjs';

test('saved Sequence results survive navigation to fresh Sequence and history selection', async ({ page }, info) => {
  test.skip(info.project.metadata.development, 'Afterimage has its own development entry.');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.removeItem('afterimage-navigation-v1'));
  await page.goto(`http://127.0.0.1:${info.project.metadata.port}/afterimage/`, { waitUntil: 'networkidle' });
  // Keep both runs in one document: mounting the second history selector after
  // saving the first used to trigger a controlled-select reactive update loop.
  expect((await page.evaluate(exerciseBoardStability, 'sequence')).passed).toBe(true);
  expect((await page.evaluate(exerciseBoardStability, 'sequence-fresh')).passed).toBe(true);
  const selector = page.locator('.ai-history-select-trigger');
  await expect(selector).toContainText('New pattern each round');
  await selector.click();
  await page.getByRole('option', { name: 'Growing pattern', exact: true }).click();
  await expect(selector).toContainText('Growing pattern');
  await expect(page.getByText('Saved under earlier rules', { exact: true })).toHaveCount(0);
  await selector.click();
  await page.getByRole('option', { name: 'Growing pattern', exact: true }).click();
  await expect(selector).toContainText('Growing pattern');
  await selector.click();
  await page.getByRole('option', { name: 'New pattern each round', exact: true }).click();
  await expect(selector).toContainText('New pattern each round');
  await expect(page.getByText('Saved under earlier rules', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Benchmark averages' })).toBeVisible();
  expect(await page.evaluate(() => ['sequence-v3-growing', 'sequence-v2-fresh'].map(scope => JSON.parse(localStorage.getItem(`afterimage-history-${scope}`)).length))).toEqual([1, 1]);
  expect(errors).toEqual([]);
});
