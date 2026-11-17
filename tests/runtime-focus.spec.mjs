import { test } from '@playwright/test';
import { exerciseRuntimeAppearanceFocus, exerciseRuntimeSearchCloseGeneration, exerciseRuntimeSearchFocus } from './runtime-focus-scenarios.mjs';

async function visit(page, info) {
  const meta = info.project.metadata;
  const port = meta.development ? meta.sitePort : meta.port;
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
}

// Include the small shared helpers when serializing scenarios into the page.
const scenarios = await (await import('node:fs/promises')).readFile(new URL('./runtime-focus-scenarios.mjs', import.meta.url), 'utf8');
const installScenarios = page => page.addScriptTag({ content: scenarios.replaceAll('export async function ', 'async function ') });

for (const motion of ['reduce', 'no-preference']) {
  test(`Search owns focus before paint and across dismissal (${motion})`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: motion });
    await visit(page, info);
    await installScenarios(page);
    await page.evaluate(() => exerciseRuntimeSearchFocus());
    if (motion === 'no-preference') await page.evaluate(() => exerciseRuntimeSearchCloseGeneration());
  });
}

test('Appearance owns focus before paint and across dismissal', async ({ page }, info) => {
  await visit(page, info);
  await installScenarios(page);
  await page.evaluate(() => exerciseRuntimeAppearanceFocus());
});
