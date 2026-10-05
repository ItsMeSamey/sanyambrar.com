// Run with bun scripts/chain-model/check-browser.mjs after the browser lane is free.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, open, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import net from 'node:net';
const root = resolve(import.meta.dirname, '../..');
const port = 4540, base = `http://127.0.0.1:${port}`;
await mkdir(resolve(root, '.tmp/chain-gameplay'), { recursive: true });
// Fail on occupied ports; never attach to somebody else's server.
await new Promise((yes, no) => {
  const probe = net.createServer(); probe.once('error', no);
  probe.listen(port, '127.0.0.1', () => probe.close(yes));
});
const log = await open(resolve(root, `.tmp/chain-gameplay/server-${Date.now()}.log`), 'w');
const server = spawn('node', ['scripts/dev.mjs', 'site'], {
  cwd: root, env: { ...process.env, SAMEY_DEV_PORT: String(port) }, stdio: ['ignore', log.fd, log.fd],
});
let browser;
const messages = [], started = performance.now();
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error(`Dev server exited ${server.exitCode}`);
    try { ready = (await fetch(`${base}/src/games/chain/bot/core.ts`)).ok; } catch {}
    if (ready) break;
    await new Promise(done => setTimeout(done, 500));
  }
  if (!ready) throw new Error('Dev server readiness timeout');
  browser = await chromium.launch({ executablePath: '/usr/bin/brave', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', message => {
    if (['warning', 'error'].includes(message.type())) messages.push({ type: message.type(),
      text: message.text().replace(/([?&]token=)[^&\s'"]+/g, '$1[redacted]') });
  });
  await page.route(`${base}/__chain-gameplay`, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Chain gameplay qualification</title>' }));
  await page.goto(`${base}/__chain-gameplay`);
  const result = await page.evaluate(async () => {
    const { chooseMove, transition } = await import('/src/games/chain/bot/core.ts');
    const { createChainBotRuntime } = await import('/src/games/chain/bot/runtime.ts');
    const rng = initial => {
      let seed = initial >>> 0;
      return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    };
    const empty = (rows, cols, players) => ({ rows, cols, players, turn: 1,
      counts: new Uint8Array(rows * cols), owners: new Uint8Array(rows * cols), entered: new Uint8Array(players) });
    const runtime = await createChainBotRuntime();
    const initialBackend = runtime.backend, games = [], probes = [];
    const elapsedStart = performance.now();
    try {
      for (const [rows, cols] of [[4, 4], [5, 7], [9, 6]]) {
        for (const seed of [13401, 13402]) for (const modelPlayer of [1, 2]) {
          const modelRandom = rng(seed), opponentRandom = rng(seed ^ 0x5a5a5a5a);
          let state = empty(rows, cols, 2), status = 'move-limit', winner = 0;
          const moves = [], maxMoves = 4 * rows * cols;
          for (let move = 0; move < maxMoves; move++) {
            const turn = state.turn;
            let index, candidates = 0;
            if (turn === modelPlayer) {
              ({ index, candidates } = await chooseMove(state, states => runtime.evaluate(states), modelRandom));
            } else {
              const legal = Array.from(state.owners, (owner, i) => owner === 0 || owner === turn ? i : -1).filter(i => i >= 0);
              index = legal[Math.floor(opponentRandom() * legal.length)];
            }
            const next = transition(state, index);
            moves.push({ turn, index, candidates, status: next.status });
            state = next.state;
            if (next.status !== 'ok') { status = next.status; winner = next.winner; break; }
          }
          games.push({ rows, cols, seed, modelPlayer, maxMoves, status, winner,
            outcome: winner ? winner === modelPlayer ? 'model-win' : 'random-win' : status, moves, backend: runtime.backend });
        }
      }
      for (const [rows, cols, players] of [[30, 30, 6], [6, 9, 2]]) {
        const state = empty(rows, cols, players); state.entered.fill(1);
        for (let player = 1; player <= players; player++) {
          const index = (player - 1) * cols + player;
          state.counts[index] = 1; state.owners[index] = player;
        }
        const decision = await chooseMove(state, states => runtime.evaluate(states), rng(13403));
        if (decision.candidates !== 4) throw new Error('Opening did not exercise all four candidates');
        const next = transition(state, decision.index);
        probes.push({ rows, cols, players, seed: 13403, ...decision, status: next.status, backend: runtime.backend });
      }
      return { initialBackend, finalBackend: runtime.backend, navigatorGpu: 'gpu' in navigator,
        browserElapsedMs: performance.now() - elapsedStart, games, probes };
    } finally { await runtime.dispose(); }
  });
  const report = { modelEpoch: 134, modelSha256: '691f5a176b9835efee8f0760582f3f5f34f6d284582bb9839fa1d625f032e86e',
    qualification: 'Seeded browser integration diagnostic; busy shared host; elapsed time is not a latency benchmark.',
    completedAt: new Date().toISOString(), ...result, totalElapsedMs: performance.now() - started, messages };
  await writeFile(resolve(root, 'scripts/chain-model/browser-gameplay.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ games: result.games.map(({ moves, ...game }) => ({ ...game, moves: moves.length })), probes: result.probes, backend: result.finalBackend }));
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    const exited = new Promise(done => server.once('exit', done));
    server.kill('SIGTERM'); await exited;
  }
  await log.close();
}
