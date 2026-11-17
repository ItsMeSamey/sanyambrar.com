import { test, expect } from '@playwright/test';

for (const game of ['tracking', 'tracking-hard']) {
  test(`${game} requires a fresh activation after movement ends`, async ({ page }, info) => {
    test.skip(info.project.metadata.development, 'Afterimage has its own development entry.');
    await page.addInitScript(() => sessionStorage.removeItem('afterimage-navigation-v1'));
    await page.goto(`http://127.0.0.1:${info.project.metadata.port}/afterimage/`, { waitUntil: 'networkidle' });
    await page.locator(`[data-game-card="${game}"]`).click();
    await page.locator('.ai-tracking-game .ai-ready button').click();
    const gameRoot = page.locator('.ai-tracking-game');
    await expect(gameRoot).toHaveAttribute('data-phase', 'move');
    const firstBall = page.locator('.ai-tracking-ball').first();
    await expect(firstBall).toBeDisabled();
    // This previously focused an inactive moving ball and armed its native Space click.
    await firstBall.evaluate(ball => ball.focus());
    await expect(firstBall).not.toBeFocused();
    await page.keyboard.down('Space');
    await expect(gameRoot).toHaveAttribute('data-phase', 'recall');
    await expect(firstBall).toBeFocused();
    await page.keyboard.up('Space');
    await expect(gameRoot).toHaveAttribute('data-phase', 'recall');
    await expect(page.locator('.ai-tracking-ball.is-correct, .ai-tracking-ball.is-wrong')).toHaveCount(0);
    await expect(page.locator('.ai-tracking-game .ai-lives strong')).toHaveAttribute('aria-label', '3 lives');
    // The very next deliberate key press still responds immediately.
    await page.keyboard.press('Enter');
    await expect.poll(async () => {
      const phase = await gameRoot.getAttribute('data-phase');
      return phase !== 'recall' || await page.locator('.ai-tracking-ball.is-correct').count() === 1;
    }).toBe(true);
  });
}
