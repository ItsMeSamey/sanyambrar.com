import { defineConfig } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

mkdirSync('.tmp/btmp', { recursive: true });
process.env.TMPDIR = process.env.BROWSER_TMPDIR ?? resolve('.tmp/btmp');
const basePort = Number(process.env.PORTFOLIO_TEST_PORT ?? 4319);
if (!Number.isInteger(basePort) || basePort < 1024 || basePort > 65532) throw new RangeError('Invalid test base port');
const executablePath = process.env.BROWSER_EXECUTABLE ?? (existsSync('/usr/bin/brave') ? '/usr/bin/brave' : undefined);
const server = (command, port) => ({ command, url: `http://127.0.0.1:${port}`, reuseExistingServer: false, env: { PORT: String(port) }, timeout: 60_000 });

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: 3,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: '.tmp/solid-v2/test-results.json' }]],
  use: {
    browserName: 'chromium',
    launchOptions: { executablePath, args: ['--disable-dev-shm-usage'] },
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'production-desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'production-mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'development-desktop', metadata: { development: true }, use: { viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: [
    server(`node node_modules/vite/bin/vite.js preview --config vite.site.config.ts --outDir docs --host 127.0.0.1 --port ${basePort} --strictPort`, basePort),
    server('node scripts/dev.mjs site', basePort + 1),
    server('node scripts/dev.mjs wordle', basePort + 2),
    server('node scripts/dev.mjs keybr', basePort + 3),
  ],
});
