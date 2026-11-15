import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { AimEngine, PressGuard, ReactionEngine, TapEngine, aimScope, reactionScope } from '../src/games/afterimage/speed-engine.ts';
import type { GameResult } from '../src/games/afterimage/types.ts';
import type { Press } from '../src/games/afterimage/speed-engine.ts';

function clock() {
  let now = 0;
  const jobs = new Set<{ at: number; fn: () => void }>();
  return {
    now: () => now,
    after(fn: () => void, ms: number) { jobs.add({ at: now + ms, fn }); },
    clear() { jobs.clear(); },
    advance(ms: number) {
      const end = now + ms;
      for (;;) {
        const next = [...jobs].filter(job => job.at <= end).sort((a, b) => a.at - b.at)[0];
        if (!next) break;
        now = next.at; jobs.delete(next); next.fn();
      }
      now = end;
    },
    stall(ms: number) { now += ms; },
    get jobs() { return jobs.size; },
  };
}
const touch = (id = 1): Press => ({ token: `pointer:${id}`, kind: 'touch' });
const mouse = (id = 1): Press => ({ token: `pointer:${id}`, kind: 'mouse' });
const key = (name = ' '): Press => ({ token: `key:${name}`, kind: 'keyboard' });

function reaction() {
  const time = clock(), results: GameResult[] = [];
  const engine = new ReactionEngine(time, () => {}, result => results.push(result), () => 0);
  return { time, engine, results };
}

test('Reaction touch release measures five trials and fresh holds resume only after the full 750ms', () => {
  const { time, engine, results } = reaction();
  engine.down(touch());
  for (let trial = 0; trial < 5; trial++) {
    time.advance(1200); engine.release(touch(trial + 1).token);
    assert.equal(engine.snapshot().sample, 200);
    engine.down(touch(trial + 2));
    time.advance(749);
    assert.equal(engine.snapshot().phase, trial === 4 ? 'result' : 'between');
    time.advance(1);
    assert.equal(engine.snapshot().phase, 'waiting');
  }
  assert.equal(results.length, 1);
  assert.equal(results[0]?.value, 200);
  assert.equal(results[0]?.scope, 'reaction-v7-touch-release');
});

test('Reaction old scoring presses cannot auto-retry; a fresh Space can overlap finishing Enter', () => {
  const { time, engine } = reaction();
  engine.down(key('Enter')); engine.release(key('Enter').token);
  time.advance(1150); engine.down(key('Enter'));
  time.advance(900);
  assert.equal(engine.snapshot().phase, 'between');
  engine.release(key('Enter').token);
  assert.equal(engine.snapshot().phase, 'between');
  engine.down(key('Enter')); engine.release(key('Enter').token);
  time.advance(1150); engine.down(key('Enter'));
  time.advance(100); engine.down(key()); engine.release(key('Enter').token);
  time.advance(649); assert.equal(engine.snapshot().phase, 'between');
  time.advance(1); assert.equal(engine.snapshot().phase, 'waiting');
  engine.down(key()); assert.equal(engine.snapshot().phase, 'waiting');
  engine.release(key().token); assert.equal(engine.snapshot().phase, 'waiting');
});

test('Reaction retries wait for old extra fingers; fresh extra fingers cannot inherit cancelled intent', () => {
  const { time, engine } = reaction();
  engine.down(touch(1)); engine.down(touch(2)); time.advance(1100); engine.release(touch(1).token);
  engine.down(touch(3)); time.advance(800);
  assert.equal(engine.snapshot().phase, 'between');
  engine.release(touch(2).token); assert.equal(engine.snapshot().phase, 'waiting');
  engine.release(touch(3).token, true);
  engine.down(touch(4)); time.advance(100); engine.release(touch(4).token);
  engine.down(touch(5)); engine.down(touch(6)); time.advance(800);
  assert.equal(engine.snapshot().phase, 'early');
  engine.release(touch(5).token); engine.release(touch(6).token);
  assert.equal(engine.snapshot().phase, 'early');
});

test('Reaction release, cancellation, movement, blur/hidden and disposal invalidate pending retry', () => {
  for (const cancel of ['release', 'cancel', 'move', 'blur', 'dispose']) {
    const { time, engine } = reaction();
    engine.down(touch()); time.advance(100); engine.release(touch().token);
    engine.down(touch(2));
    if (cancel === 'release') engine.release(touch(2).token);
    if (cancel === 'cancel') engine.release(touch(2).token, true);
    if (cancel === 'move') engine.invalidate(touch(2).token);
    if (cancel === 'blur') engine.cancel();
    if (cancel === 'dispose') engine.dispose();
    time.advance(1000);
    assert.notEqual(engine.snapshot().phase, 'waiting', cancel);
    assert.notEqual(engine.snapshot().phase, 'go', cancel);
  }
});

test('Reaction shares mouse/keyboard scope while excluding touch and pen during a run', () => {
  const { time, engine, results } = reaction();
  engine.down(mouse()); engine.release(mouse().token);
  for (let i = 0; i < 5; i++) {
    time.advance(1200); engine.down(touch(10)); engine.release(touch(10).token);
    assert.equal(engine.snapshot().phase, 'go');
    engine.down(key()); engine.release(key().token);
    if (i < 4) { time.advance(750); engine.down(mouse()); engine.release(mouse().token); }
  }
  assert.equal(results[0]?.scope, 'reaction-v7-desktop');
  assert.equal(results[0]?.details?.inputKind, 'mixed');
  assert.equal(reactionScope('pen'), 'reaction-v7-pen');
});

test('TPS counts simultaneous fresh touch downs once each and rejects mouse/keyboard mixing', () => {
  const time = clock(), results: GameResult[] = [];
  const engine = new TapEngine(time, () => {}, result => results.push(result));
  engine.down(touch()); engine.down(touch(2)); engine.down(touch(2)); engine.down(mouse(3)); engine.down(key());
  assert.equal(engine.snapshot().count, 2);
  engine.release(touch().token); engine.release(touch(2).token);
  time.advance(9900); engine.down(touch(3)); time.advance(100);
  assert.equal(results[0]?.value, 0.3);
  assert.equal(results[0]?.scope, 'tps-v3-touch-10s');
  time.advance(800); assert.equal(engine.snapshot().blocked, true);
  engine.release(touch(3).token); assert.equal(engine.snapshot().blocked, false);
  engine.down(touch(4)); assert.equal(engine.snapshot().count, 1);
});

test('CPS excludes a late press at exact deadline and never reuses it to start a new run', () => {
  const time = clock(), results: GameResult[] = [];
  const engine = new TapEngine(time, () => {}, result => results.push(result));
  engine.down(mouse()); engine.release(mouse().token);
  time.stall(10000); engine.down(mouse(2));
  assert.equal(engine.snapshot().phase, 'result');
  assert.equal(results[0]?.value, 0.1);
  assert.equal(results[0]?.scope, 'cps-v1-mouse-10s');
  time.advance(800); engine.down(mouse(2)); assert.equal(engine.snapshot().phase, 'result');
  engine.release(mouse(2).token); engine.down(mouse(3)); assert.equal(engine.snapshot().count, 1);
});

test('Keyboard tapping practice never saves and cancel clears deadline callbacks', () => {
  const time = clock(), results: GameResult[] = [];
  const engine = new TapEngine(time, () => {}, result => results.push(result));
  engine.togglePractice(); engine.down(key()); engine.down(key());
  assert.equal(engine.snapshot().count, 1);
  time.advance(10000); assert.equal(results.length, 0);
  time.advance(750); engine.release(key().token); engine.down(key()); engine.cancel();
  assert.equal(time.jobs, 0);
  time.advance(20000); assert.equal(engine.snapshot().phase, 'ready');
});

test('Aim scores on down, rejects held replacement target, measures each appearance precisely and preserves format scopes', () => {
  for (const kind of ['touch', 'mouse', 'keyboard', 'pen'] as const) {
    const time = clock(), results: GameResult[] = [];
    const engine = new AimEngine(time, () => {}, result => results.push(result), () => 0);
    engine.geometry(970, 500);
    const press = { token: 'one', kind };
    engine.down(press); assert.equal(engine.snapshot().hits, 0);
    engine.down(press); assert.equal(engine.snapshot().hits, 0);
    engine.release('one');
    assert.equal(engine.snapshot().target?.x, 50); assert.equal(engine.snapshot().target?.y, 50);
    for (let n = 1; n <= 30; n++) {
      time.advance(100.25); engine.down(press); engine.down(press);
      assert.equal(engine.snapshot().hits, n); engine.release('one');
    }
    assert.equal(results.length, 1);
    assert.equal(results[0]?.value, 100);
    assert.equal(results[0]?.scope, aimScope(kind, 'standard'));
    assert.equal(results[0]?.details?.elapsed, 3.0075);
    time.advance(749); engine.down(press); engine.release('one'); assert.equal(engine.snapshot().phase, 'result');
    time.advance(1); engine.down(press); assert.equal(engine.snapshot().phase, 'running');
  }
});

test('Aim resize cancels the run, changes geometry scope, and never saves unfinished work', () => {
  const time = clock(), results: GameResult[] = [];
  const engine = new AimEngine(time, () => {}, result => results.push(result), () => 0);
  engine.geometry(970, 500); engine.down(touch()); engine.release(touch().token);
  time.advance(150); engine.down(touch()); engine.release(touch().token);
  engine.geometry(398, 300);
  assert.equal(engine.snapshot().phase, 'ready'); assert.equal(engine.snapshot().format, 'compact');
  engine.down(touch()); assert.equal(engine.snapshot().target?.x, 18); assert.equal(engine.snapshot().target?.y, 82);
  engine.dispose(); assert.equal(time.jobs, 0); assert.equal(results.length, 0);
});

test('Default result guard requires release and a fresh press after 750ms', () => {
  const time = clock(); let resumed = 0;
  const guard = new PressGuard(time.now, () => resumed++);
  guard.down(mouse()); guard.begin();
  time.advance(800); guard.tick(); assert.equal(resumed, 0); assert.equal(guard.blocked, true);
  guard.release(mouse().token); assert.equal(guard.blocked, false);
  assert.equal(guard.down(mouse()), true);
});
