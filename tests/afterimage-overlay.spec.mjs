import { test } from '@playwright/test';
import { exerciseGameOverlayOwnership } from './afterimage-overlay-scenarios.mjs';

for (const game of ['visual', 'sequence', 'number', 'chimp', 'number-order', 'verbal', 'pairs', 'rhythm', 'tracking', 'tracking-hard', 'rotation', 'paper-folding', 'deduction', 'colour-match', 'reaction', 'aim', 'cps']) {
  test(`${game} yields focus and input to a shared popover`, async ({ page }, info) => {
    test.skip(info.project.metadata.development, 'Afterimage has its own development entry.');
    await page.addInitScript(() => sessionStorage.removeItem('afterimage-navigation-v1'));
    await page.goto(`http://127.0.0.1:${info.project.metadata.port}/afterimage/`, { waitUntil: 'networkidle' });
    await page.evaluate(exerciseGameOverlayOwnership, game);
  });
}
