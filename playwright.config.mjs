import { defineConfig } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const executablePath = process.env.BROWSER_EXECUTABLE ?? (existsSync('/usr/bin/brave') ? '/usr/bin/brave' : undefined);
const requestedPortBase = Number(process.env.SAMEY_TEST_PORT_BASE ?? 4319);
if (!Number.isSafeInteger(requestedPortBase) || requestedPortBase < 1024 || requestedPortBase > 65532) throw new Error('SAMEY_TEST_PORT_BASE must leave four valid ports');
const ports = { production: requestedPortBase, site: requestedPortBase + 1, wordle: requestedPortBase + 2, keybr: requestedPortBase + 3 };
const parent = resolve(import.meta.dirname, '..');
const projectRoot = basename(parent) === '.worktree' ? resolve(parent, '..') : import.meta.dirname;
const browserTmp = resolve(projectRoot, '.tmp', `pw-${requestedPortBase}`);
mkdirSync(browserTmp, { recursive: true });
process.env.TMPDIR = browserTmp;
const server = (command, port) => ({ command, url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 60_000 });

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
    { name: 'production-desktop', metadata: { port: ports.production }, use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'production-mobile', metadata: { port: ports.production }, use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'development-desktop', metadata: { development: true, sitePort: ports.site, wordlePort: ports.wordle, keybrPort: ports.keybr }, use: { viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: [
    server(`node node_modules/vite/bin/vite.js preview --config vite.site.config.ts --outDir docs --host 127.0.0.1 --port ${ports.production} --strictPort`, ports.production),
    server(`SAMEY_DEV_PORT=${ports.site} node scripts/dev.mjs site`, ports.site),
    server(`SAMEY_DEV_PORT=${ports.wordle} node scripts/dev.mjs wordle`, ports.wordle),
    server(`SAMEY_DEV_PORT=${ports.keybr} node scripts/dev.mjs keybr`, ports.keybr),
  ],
});
