import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const golden = JSON.parse(readFileSync(new URL('./fixtures/chain-model.json', import.meta.url), 'utf8'));
const GAME = 'samey.chain.game.v4';
const MATCHES = 'samey.chain.matches.v1';
const MODEL = /epoch134.*\.onnx(?:\?|$)/;
test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

function url(info, path = '/chain/') {
  const meta = info.project.metadata;
  return `http://127.0.0.1:${meta.development ? meta.sitePort : meta.port}${path}`;
}
async function visit(page, info, path) {
  await page.goto(url(info, path), { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.chain-opening article').first().locator('p')).not.toHaveText('Saved board');
  await expect(page.locator('.engine-state-loading')).toBeHidden();
  await expect(page.locator('.engine-state-error')).toHaveCount(0);
}
async function saved(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), GAME);
}
async function moves(page, count) {
  await expect.poll(async () => (await saved(page))?.m.length, { timeout: 90_000 }).toBe(count);
}
async function human(page) {
  const grid = page.getByRole('grid', { name: /Chain Reaction board/ });
  await expect(grid).toBeVisible();
  await grid.focus();
  await page.keyboard.press('Enter');
}
function seed(players = 2, old = false) {
  const b = new Uint8Array(54), o = new Uint8Array(54), p = new Uint8Array(players + 1);
  b[0] = o[0] = p[1] = 1;
  return {
    v: 4, id: `qa-bot-${players}`, r: 9, c: 6, e: players - 1,
    b: Buffer.from(b).toString('base64'), o: Buffer.from(o).toString('base64'),
    p: Buffer.from(p).toString('base64'), t: 2, g: false, i: true, m: [1024], q: true,
    pl: Array.from({ length: players }, (_, i) => ({
      id: i + 1, name: i ? `${old ? 'Random' : 'CRT'} Bot ${i}` : 'You',
      kind: i ? 'bot' : 'human', color: i ? '#00bbff' : '#ff4444',
      ...(i ? { bot: { id: old ? 'random' : 'crt-v7', name: old ? 'Random Bot' : 'CRT Bot',
        version: old ? 1 : 134, settings: {} } } : {}),
    })),
  };
}
async function install(page, value, history) {
  await page.addInitScript(({ key, value, historyKey, history }) => {
    localStorage.setItem(key, JSON.stringify(value));
    if (history) localStorage.setItem(historyKey, JSON.stringify(history));
  }, { key: GAME, value, historyKey: MATCHES, history });
}
function assertOpeningRound(value, players) {
  expect(value.m[0]).toBe(1024);
  expect(value.t).toBe(1);
  expect(value.m.map(move => Math.floor(move / 1024))).toEqual(Array.from({ length: players }, (_, i) => i + 1));
  const chosen = value.m.map(move => move % 1024);
  expect(new Set(chosen).size).toBe(players);
  for (const index of chosen) expect(index).toBeLessThan(value.r * value.c);
  expect([...Buffer.from(value.p, 'base64')]).toEqual([0, ...Array(players).fill(1)]);
  for (const player of value.pl.slice(1)) expect(player.bot).toMatchObject({ id: 'crt-v7', version: 134 });
}

test('menu keeps inference lazy; classic game uses the real worker for a legal move', async ({ page }, info) => {
  const requests = [], workers = [];
  page.on('request', request => requests.push(request.url()));
  page.on('worker', worker => workers.push(worker.url()));
  await visit(page, info);
  await expect(page.getByRole('button', { name: 'Start classic', exact: true })).toBeVisible();
  expect(requests.filter(value => /epoch134|ort-wasm|onnxruntime|bot\/runtime\.ts/.test(value))).toEqual([]);
  expect(workers).toEqual([]);
  await page.getByRole('button', { name: 'Start classic', exact: true }).click();
  await human(page);
  await moves(page, 2);
  assertOpeningRound(await saved(page), 2);
  expect(workers.length).toBeGreaterThan(0);
  expect(requests.some(value => MODEL.test(value))).toBe(true);
  await expect(page.locator('.chain-bot-status')).toBeHidden();
});

test('actual ORT Web WASM logits match every Torch golden batch and survive disposal', async ({ page }, info) => {
  test.skip(!info.project.metadata.development, 'Source runtime API is available on the development server');
  await visit(page, info);
  // Vite may reload once when this lazy dependency is optimized for the first time.
  // Warm only the module; inference and numerical failures below are never retried.
  try { await page.evaluate(() => import('/src/games/chain/bot/runtime.ts').then(() => undefined)); }
  catch (error) {
    if (!String(error).includes('Execution context was destroyed')) throw error;
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => import('/src/games/chain/bot/runtime.ts').then(() => undefined));
  }
  const results = await page.evaluate(async fixtures => {
    const { createChainBotRuntime } = await import('/src/games/chain/bot/runtime.ts');
    const runtime = await createChainBotRuntime({ backend: 'wasm' });
    const results = [];
    let retained;
    try {
      for (const fixture of fixtures) {
        const b = fixture.board;
        const states = b.counts.map((counts, i) => ({
          rows: b.rows, cols: b.cols, players: b.players, turn: b.turns[i],
          counts: new Uint8Array(counts), owners: new Uint8Array(b.owners[i]),
          entered: new Uint8Array(b.entered[i]),
        }));
        const output = await runtime.evaluate(states);
        retained ??= { data: output.policyLogits, copy: Array.from(output.policyLogits) };
        const diff = (actual, expected) => {
          if (actual.length !== expected.length) throw new Error('Golden output shape mismatch');
          return Math.max(...actual.map((value, i) => Math.abs(value - expected[i])));
        };
        results.push({ backend: runtime.backend,
          policy: diff(output.policyLogits, fixture.outputs.policy_logits.data),
          value: diff(output.valueLogits, fixture.outputs.value_logits.data) });
      }
    } finally { await runtime.dispose(); }
    if (retained.copy.some((value, i) => value !== retained.data[i])) throw new Error('Returned logits lost tensor storage');
    return results;
  }, golden);
  await info.attach('wasm-torch-parity', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
  expect(results).toHaveLength(golden.length);
  for (const result of results) {
    expect(result.backend).toBe('wasm');
    expect(result.policy).toBeLessThan(5e-4);
    expect(result.value).toBeLessThan(5e-4);
  }
});

for (const players of [3, 4, 5, 6]) test(`real workers finish a legal opening round with ${players} players`, async ({ page }, info) => {
  test.skip(!info.project.metadata.development, 'The multi-player matrix runs once');
  await install(page, seed(players));
  await visit(page, info, '/chain/?p=game');
  await moves(page, players);
  assertOpeningRound(await saved(page), players);
});

test('failed model download exposes the complete error and Retry preserves the human move', async ({ page }, info) => {
  let failed = true;
  await page.route(MODEL, route => failed && route.request().resourceType() !== 'script'
    ? route.fulfill({ status: 503, contentType: 'text/plain', body: 'QA model temporarily unavailable' })
    : route.continue());
  await visit(page, info);
  await page.getByRole('button', { name: 'Start classic', exact: true }).click();
  await human(page);
  const status = page.locator('.chain-bot-status[data-error="true"]');
  await expect(status).toBeVisible({ timeout: 30_000 });
  await expect(status.locator('pre.samey-error-stack')).toBeVisible();
  await expect(status.locator('pre.samey-error-stack')).toContainText('HTTP 503');
  expect((await saved(page)).m).toEqual([1024]);
  failed = false;
  await status.getByRole('button', { name: 'Retry opponent', exact: true }).click();
  await moves(page, 2);
  assertOpeningRound(await saved(page), 2);
  await expect(page.locator('.chain-bot-status')).toBeHidden();
});

for (const destination of ['menu', 'stats', 'reset', 'unmount']) test(`pending download cannot write a stale move after ${destination}`, async ({ page }, info) => {
  test.skip(info.project.name !== 'production-desktop', 'Cancellation matrix runs once against the production worker');
  let release;
  const held = new Promise(resolve => { release = resolve; });
  let requested;
  const requestSeen = new Promise(resolve => { requested = resolve; });
  let workerClosed;
  page.on('worker', worker => { workerClosed = new Promise(resolve => worker.once('close', resolve)); });
  let requestReleased;
  const requestDone = new Promise(resolve => { requestReleased = resolve; });
  await page.route(MODEL, async route => {
    requested();
    await held;
    await route.continue().catch(() => {});
    requestReleased();
  });
  await visit(page, info);
  await page.getByRole('button', { name: 'Start classic', exact: true }).click();
  await human(page);
  await requestSeen;
  const original = await saved(page);
  if (destination === 'menu') await page.getByRole('link', { name: 'Back to Chain Reaction menu', exact: true }).click();
  else if (destination === 'stats') await page.getByRole('button', { name: 'Statistics', exact: true }).filter({ visible: true }).click();
  else if (destination === 'reset') {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Start new game', exact: true }).click();
  } else await page.goto(url(info, '/work/'));
  if (destination === 'menu' || destination === 'stats') await expect.poll(async () => (await saved(page))?.i).toBe(false);
  const cancelled = await saved(page);
  await workerClosed;
  release();
  // The real inference worker must close before the held model request is released.
  await requestDone;
  const after = await saved(page);
  expect(after.m).toEqual(cancelled.m);
  expect(after.b).toBe(cancelled.b);
  expect(after.id).toBe(cancelled.id);
  if (destination === 'reset') {
    expect(after.id).not.toBe(original.id);
    expect(after.m).toEqual([]);
  } else {
    await page.unroute(MODEL);
    await page.goto(url(info, '/chain/?p=game'));
    await moves(page, 2);
    expect((await saved(page)).id).toBe(original.id);
    assertOpeningRound(await saved(page), 2);
  }
});

test('resumed unfinished Random Bot upgrades at the cutover while completed history stays historical', async ({ page }, info) => {
  const value = seed(2, true);
  const historical = { id: 'qa-historical-random', t: 1, u: 2, end: 2, s: 'completed', w: 1,
    r: 9, c: 6, e: 1, m: [1024, 2101], q: true, p: value.pl, parent: '', fork: 0 };
  await install(page, value, { v: 1, base: { games: 0, wins: 0, largest: 0 }, matches: [historical] });
  await visit(page, info, '/chain/?p=game');
  await moves(page, 2);
  const result = await saved(page);
  expect(result.m[0]).toBe(value.m[0]);
  expect(result.pl[1].bot).toMatchObject({ id: 'crt-v7', version: 134,
    settings: { previousBot: 'random', upgradedAtMove: 1 } });
  const record = await page.evaluate(({ key, id }) =>
    JSON.parse(localStorage.getItem(key)).matches.find(match => match.id === id),
  { key: MATCHES, id: historical.id });
  expect(record.p).toEqual(historical.p);
  expect(record.m).toEqual(historical.m);
});

test('a replay fork keeps recorded Random Bot moves and upgrades only its future opponents', async ({ page }, info) => {
  const oldPlayers = seed(2, true).pl;
  const original = { id: 'qa-old-replay', t: 1, u: 2, end: 2, s: 'completed', w: 1,
    r: 4, c: 4, e: 1, m: [1024, 2063, 1025, 2062], q: true, p: oldPlayers, parent: '', fork: 0 };
  await page.addInitScript(({ key, original }) => localStorage.setItem(key, JSON.stringify({
    v: 1, base: { games: 0, wins: 0, largest: 0 }, matches: [original],
  })), { key: MATCHES, original });
  await visit(page, info);
  await page.getByRole('button', { name: 'Statistics', exact: true }).first().click();
  await page.locator('.chain-stat-row-button').first().click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.chain-replay-controls output')).toHaveText('Move 1 / 4');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.chain-replay-controls output')).toHaveText('Move 2 / 4');
  await page.getByRole('button', { name: 'Resume from here', exact: true }).click();
  await moves(page, 2);
  const fork = await saved(page);
  expect(fork.id).not.toBe(original.id);
  expect(fork.m).toEqual(original.m.slice(0, 2));
  expect(fork.pl[1].bot).toMatchObject({ id: 'crt-v7', version: 134,
    settings: { previousBot: 'random', upgradedAtMove: 2 } });
  const records = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).matches, MATCHES);
  expect(records.find(record => record.id === original.id).p).toEqual(oldPlayers);
  expect(records.find(record => record.id === fork.id)).toMatchObject({ parent: original.id, fork: 2 });
});

test('completed legacy v3 board retains Random Bot metadata without downloading a model', async ({ page }, info) => {
  const value = { ...seed(2), v: 3, t: 1, g: true, p: Buffer.from([0, 1, 1]).toString('base64') };
  delete value.pl;
  delete value.id;
  await page.addInitScript(value => localStorage.setItem('samey.chain.game.v3', JSON.stringify(value)), value);
  const requests = [];
  page.on('request', request => { if (MODEL.test(request.url())) requests.push(request.url()); });
  await visit(page, info, '/chain/?p=game');
  await expect(page.getByRole('dialog', { name: 'You win', exact: true })).toBeVisible();
  const restored = await saved(page);
  expect(restored.g).toBe(true);
  expect(restored.m).toEqual(value.m);
  expect(restored.pl[1].bot).toMatchObject({ id: 'random', version: 1 });
  expect(requests).toEqual([]);
});

test('visibility returns during a locked three-player cascade and opponents resume once', async ({ page }, info) => {
  test.skip(info.project.name !== 'production-desktop', 'The deterministic lifecycle edge runs once');
  const value = seed(3);
  value.t = 1;
  await install(page, value);
  await visit(page, info, '/chain/?p=game');
  const grid = page.getByRole('grid', { name: /Chain Reaction board/ });
  await expect(grid).toBeVisible();
  await grid.focus();
  await grid.evaluate(element => {
    // Enter explodes the occupied corner and suspends the cascade at its real
    // animation timer. Both visibility events run before that timer can fire.
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    delete document.hidden;
  });
  await moves(page, 4);
  const result = await saved(page);
  expect(result.m.slice(0, 2)).toEqual([1024, 1024]);
  expect(result.m.map(move => Math.floor(move / 1024))).toEqual([1, 1, 2, 3]);
  expect(result.t).toBe(1);
  await expect(page.locator('.chain-bot-status')).toBeHidden();
});
