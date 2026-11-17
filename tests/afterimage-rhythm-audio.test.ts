import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { composeRhythm, createRhythmAudio, type RhythmAudio } from '../src/games/afterimage/rhythm-audio.ts';
import type { RhythmRenderRequest, RhythmRenderResponse } from '../src/games/afterimage/rhythm-synthesis.ts';

class FakeParam {
  value = 1;
  changes: { type: string; value?: number; at: number }[] = [];
  cancelScheduledValues(at: number) { this.changes.push({ type: 'cancel', at }); }
  setValueAtTime(value: number, at: number) { this.value = value; this.changes.push({ type: 'value', value, at }); }
  linearRampToValueAtTime(value: number, at: number) { this.value = value; this.changes.push({ type: 'ramp', value, at }); }
  setTargetAtTime(value: number, at: number) { this.value = value; this.changes.push({ type: 'target', value, at }); }
}
class FakeNode {
  disconnected = false;
  connections: unknown[] = [];
  connect(node: unknown) { this.connections.push(node); }
  disconnect() { this.disconnected = true; }
}
class FakeGain extends FakeNode { gain = new FakeParam(); }
class FakeLimiter extends FakeNode {
  threshold = new FakeParam(); knee = new FakeParam(); ratio = new FakeParam(); attack = new FakeParam(); release = new FakeParam();
}
class FakeBuffer {
  copies: Float32Array[] = [];
  constructor(readonly channels: number, readonly length: number, readonly sampleRate: number) {}
  copyToChannel(samples: Float32Array, channel: number) { this.copies[channel] = samples.slice(); }
}
class FakeSource extends FakeNode {
  buffer?: FakeBuffer;
  onended: (() => void) | null = null;
  starts: number[] = [];
  stops: (number | undefined)[] = [];
  start(when: number) { this.starts.push(when); }
  stop(when?: number) { this.stops.push(when); }
  finish() { this.onended?.(); }
}
class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  static resumeMode: 'immediate' | 'deferred' | 'reject' = 'immediate';
  static failLimiter = false;
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  currentTime = 10;
  baseLatency = 0.008;
  outputLatency = 0.012;
  destination = new FakeNode();
  gains: FakeGain[] = [];
  limiters: FakeLimiter[] = [];
  sources: FakeSource[] = [];
  buffers: FakeBuffer[] = [];
  resumes = 0;
  suspends = 0;
  closes = 0;
  finishResume: (() => void) | undefined;
  constructor(readonly options: { latencyHint: string }) { FakeAudioContext.instances.push(this); }
  createGain() { const gain = new FakeGain(); this.gains.push(gain); return gain; }
  createDynamicsCompressor() {
    if (FakeAudioContext.failLimiter) throw new Error('audio graph unavailable');
    const limiter = new FakeLimiter(); this.limiters.push(limiter); return limiter;
  }
  createBuffer(channels: number, length: number, sampleRate: number) {
    const buffer = new FakeBuffer(channels, length, sampleRate); this.buffers.push(buffer); return buffer;
  }
  createBufferSource() { const source = new FakeSource(); this.sources.push(source); return source; }
  getOutputTimestamp() { return { contextTime: 9.98, performanceTime: 4000 }; }
  resume() {
    this.resumes++;
    if (FakeAudioContext.resumeMode === 'reject') return Promise.reject(new Error('blocked'));
    if (FakeAudioContext.resumeMode === 'deferred') return new Promise<void>(resolve => {
      this.finishResume = () => { if (this.state !== 'closed') this.state = 'running'; resolve(); };
    });
    this.state = 'running';
    return Promise.resolve();
  }
  suspend() { this.suspends++; if (this.state !== 'closed') this.state = 'suspended'; return Promise.resolve(); }
  close() { this.closes++; this.state = 'closed'; return Promise.resolve(); }
}
class FakeDocument {
  hidden = false;
  listeners = new Set<() => void>();
  addEventListener(type: string, listener: () => void) { if (type === 'visibilitychange') this.listeners.add(listener); }
  removeEventListener(type: string, listener: () => void) { if (type === 'visibilitychange') this.listeners.delete(listener); }
  changeVisibility(hidden: boolean) { this.hidden = hidden; for (const listener of this.listeners) listener(); }
}
class FakeWorker {
  static instances: FakeWorker[] = [];
  static failConstruction = false;
  onmessage: ((event: { data: RhythmRenderResponse }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessageerror: (() => void) | null = null;
  requests: RhythmRenderRequest[] = [];
  terminated = false;
  constructor(readonly url: URL, readonly options: { type: string }) {
    if (FakeWorker.failConstruction) throw new Error('workers unavailable');
    FakeWorker.instances.push(this);
  }
  postMessage(request: RhythmRenderRequest) { this.requests.push(request); }
  terminate() { this.terminated = true; }
  response(request = this.requests.at(-1)!) {
    const pcm = { sampleRate: 24000, left: new Float32Array([0, 0.2, 0]), right: new Float32Array([0, 0.2, 0]) };
    return { id: request.id, pcm: { phrase: pcm, taps: request.composition.targetNotes.map(() => pcm) } };
  }
  succeed(request?: RhythmRenderRequest) { this.onmessage?.({ data: this.response(request) }); }
}

const saved = new Map<string, PropertyDescriptor | undefined>();
const owned: RhythmAudio[] = [];
let fakeDocument: FakeDocument;
function install(name: string, value: unknown) {
  saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}
function makeAudio() { const audio = createRhythmAudio(); owned.push(audio); return audio; }
function latestContext() { return FakeAudioContext.instances.at(-1)!; }
function latestWorker() { return FakeWorker.instances.at(-1)!; }
function fakeTimers() {
  const timers = new Map<number, { run: () => void; delay: number }>();
  let serial = 0;
  install('setTimeout', (run: () => void, delay: number) => {
    const id = ++serial; timers.set(id, { run, delay }); return id;
  });
  install('clearTimeout', (id: number) => { timers.delete(id); });
  return timers;
}
async function prepared(audio: RhythmAudio, composition = composeRhythm({ seed: 900, level: 4 })) {
  const waiting = audio.prepare(composition);
  latestWorker().succeed();
  expect(await waiting).toBe(true);
  return composition;
}

beforeEach(() => {
  FakeAudioContext.instances = [];
  FakeAudioContext.resumeMode = 'immediate';
  FakeAudioContext.failLimiter = false;
  FakeWorker.instances = [];
  FakeWorker.failConstruction = false;
  fakeDocument = new FakeDocument();
  install('window', { AudioContext: FakeAudioContext });
  install('document', fakeDocument);
  install('Worker', FakeWorker);
});
afterEach(() => {
  for (const audio of owned.splice(0)) audio.dispose();
  for (const [name, descriptor] of saved) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
  saved.clear();
});

describe('Rhythm audio gesture, worker and playback lifecycle', () => {
  test('unlock calls resume synchronously, reuses one context, and reports rejection', async () => {
    const audio = makeAudio();
    FakeAudioContext.resumeMode = 'deferred';
    const unlocking = audio.unlock();
    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(latestContext().resumes).toBe(1);
    expect(latestContext().options.latencyHint).toBe('interactive');
    latestContext().finishResume?.();
    expect(await unlocking).toBe(true);
    FakeAudioContext.resumeMode = 'immediate';
    expect(await audio.unlock()).toBe(true);
    expect(FakeAudioContext.instances).toHaveLength(1);
    FakeAudioContext.resumeMode = 'reject';
    expect(await audio.unlock()).toBe(false);
  });

  test('requires both prepared music and a running context before scheduling audio', async () => {
    const audio = makeAudio();
    const composition = composeRhythm({ seed: 1 });
    expect(audio.play(composition)).toBeNull();
    await prepared(audio, composition);
    expect(audio.play(composition)).toBeNull();
    expect(await audio.unlock()).toBe(true);
    expect(audio.play(composeRhythm({ seed: 2 }))).toBeNull();
    const playback = audio.play(composition);
    expect(playback?.startedAtMs).toBeCloseTo(4096, 5);
    expect(playback?.durationMs).toBe(composition.durationMs);
    expect(latestContext().sources[0].starts).toEqual([10.07]);
    expect(latestContext().buffers).toHaveLength(2);
    expect(latestContext().buffers[0].copies[0]).toEqual(new Float32Array([0, 0.2, 0]));
    audio.tap(composition, 0);
    expect(latestContext().sources[1].starts).toEqual([10]);
    expect(latestContext().buffers).toHaveLength(2);
    audio.tap(composition, -1);
    audio.tap(composition, 1000);
    expect(latestContext().sources).toHaveLength(2);
  });

  test('a blocked resume and a stalled worker fail within bounded deadlines', async () => {
    const timers = fakeTimers();
    const audio = makeAudio();
    FakeAudioContext.resumeMode = 'deferred';
    const unlocking = audio.unlock();
    const resumeDeadline = [...timers.values()][0];
    expect(resumeDeadline.delay).toBeGreaterThan(0);
    expect(resumeDeadline.delay).toBeLessThanOrEqual(5000);
    resumeDeadline.run();
    expect(await unlocking).toBe(false);
    expect(timers.size).toBe(0);
    const preparing = audio.prepare(composeRhythm({ seed: 81 }));
    const workerDeadline = [...timers.values()][0];
    expect(workerDeadline.delay).toBeGreaterThan(0);
    expect(workerDeadline.delay).toBeLessThanOrEqual(5000);
    workerDeadline.run();
    expect(await preparing).toBe(false);
    expect(latestWorker().terminated).toBe(true);
    expect(timers.size).toBe(0);
  });

  test('stop settles a pending unlock without waiting for the browser resume promise', async () => {
    const timers = fakeTimers();
    const audio = makeAudio();
    FakeAudioContext.resumeMode = 'deferred';
    const unlocking = audio.unlock();
    audio.stop();
    expect(timers.size).toBe(0);
    expect(await unlocking).toBe(false);
    latestContext().finishResume?.();
    expect(await unlocking).toBe(false);
    expect(latestContext().sources).toHaveLength(0);
  });

  test('a partial audio graph closes its context and permits a fresh retry', async () => {
    const audio = makeAudio();
    FakeAudioContext.failLimiter = true;
    expect(await audio.unlock()).toBe(false);
    expect(latestContext().closes).toBe(1);
    expect(latestContext().state).toBe('closed');
    FakeAudioContext.failLimiter = false;
    expect(await audio.unlock()).toBe(true);
    expect(FakeAudioContext.instances).toHaveLength(2);
    expect(latestContext().resumes).toBe(1);
  });

  test('buffer allocation failures report no playback and tap failures stay contained', async () => {
    const audio = makeAudio();
    await audio.unlock();
    const composition = await prepared(audio);
    latestContext().createBuffer = () => { throw new Error('allocation unavailable'); };
    expect(audio.play(composition)).toBeNull();
    expect(() => audio.tap(composition, 0)).not.toThrow();
    expect(latestContext().sources).toHaveLength(0);
  });

  test('replacing preparation resolves the old request and ignores its late response', async () => {
    const audio = makeAudio();
    await audio.unlock();
    const first = composeRhythm({ seed: 1 });
    const second = composeRhythm({ seed: 2 });
    const firstWaiting = audio.prepare(first);
    const staleWorker = latestWorker();
    const staleHandler = staleWorker.onmessage!;
    const secondWaiting = audio.prepare(second);
    expect(await firstWaiting).toBe(false);
    expect(staleWorker.terminated).toBe(true);
    staleHandler({ data: staleWorker.response() });
    expect(audio.play(first)).toBeNull();
    expect(audio.play(second)).toBeNull();
    latestWorker().succeed();
    expect(await secondWaiting).toBe(true);
    expect(audio.play(second)).not.toBeNull();
  });

  test('stop and worker failures settle preparation rather than leaving pending promises', async () => {
    const audio = makeAudio();
    const composition = composeRhythm({ seed: 3 });
    const stopped = audio.prepare(composition);
    const worker = latestWorker();
    audio.stop();
    expect(await stopped).toBe(false);
    expect(worker.terminated).toBe(true);
    const failed = audio.prepare(composition);
    latestWorker().onerror?.();
    expect(await failed).toBe(false);
    const unreadable = audio.prepare(composition);
    latestWorker().onmessageerror?.();
    expect(await unreadable).toBe(false);
    FakeWorker.failConstruction = true;
    expect(await audio.prepare(composition)).toBe(false);
  });

  test('worker-reported rendering errors are explicit failures and can be retried', async () => {
    const audio = makeAudio();
    const composition = composeRhythm({ seed: 4 });
    const waiting = audio.prepare(composition);
    const worker = latestWorker();
    worker.onmessage?.({ data: { id: worker.requests[0].id, error: 'failed' } });
    expect(await waiting).toBe(false);
    expect(await prepared(audio, composition)).toBe(composition);
  });

  test('hidden documents stop sources, cancel preparation, and suspend without automatic resume', async () => {
    const audio = makeAudio();
    await audio.unlock();
    const composition = await prepared(audio);
    audio.play(composition);
    const pending = audio.prepare(composeRhythm({ seed: 55 }));
    fakeDocument.changeVisibility(true);
    expect(await pending).toBe(false);
    expect(latestContext().sources[0].stops).toEqual([10.015]);
    expect(latestContext().suspends).toBe(1);
    expect(audio.play(composition)).toBeNull();
    expect(await audio.unlock()).toBe(false);
    fakeDocument.changeVisibility(false);
    expect(latestContext().resumes).toBe(1);
    expect(audio.play(composition)).toBeNull();
  });

  test('unlock after hiding removes interrupted sources before resuming the audio clock', async () => {
    const audio = makeAudio();
    await audio.unlock();
    const composition = await prepared(audio);
    audio.play(composition);
    const interrupted = latestContext().sources[0];
    fakeDocument.changeVisibility(true);
    expect(interrupted.disconnected).toBe(false);
    fakeDocument.changeVisibility(false);
    const resumed = audio.unlock();
    expect(interrupted.disconnected).toBe(true);
    expect(interrupted.stops.at(-1)).toBeUndefined();
    expect(await resumed).toBe(true);
    expect(latestContext().sources.filter(source => !source.disconnected)).toHaveLength(0);
  });

  test('stop uses a short gain release and ended nodes disconnect', async () => {
    const audio = makeAudio();
    await audio.unlock();
    const composition = await prepared(audio);
    audio.play(composition);
    const context = latestContext();
    audio.stop();
    expect(context.gains[1].gain.changes).toContainEqual({ type: 'ramp', value: 0, at: 10.012 });
    expect(context.sources[0].stops).toEqual([10.015]);
    context.sources[0].finish();
    expect(context.sources[0].disconnected).toBe(true);
    expect(context.gains[1].disconnected).toBe(true);
  });

  test('rapid taps keep at most twelve retained sources', async () => {
    const audio = makeAudio();
    await audio.unlock();
    const composition = await prepared(audio);
    for (let index = 0; index < 100; index++) audio.tap(composition, 0);
    const retained = latestContext().sources.filter(source => !source.disconnected);
    expect(retained.length).toBeLessThanOrEqual(12);
    audio.dispose();
    expect(latestContext().sources.every(source => source.disconnected)).toBe(true);
  });

  test('a full voice budget reports playback failure instead of claiming a silent phrase started', async () => {
    const audio = makeAudio();
    await audio.unlock();
    const composition = await prepared(audio);
    for (let index = 0; index < 12; index++) audio.tap(composition, 0);
    expect(audio.play(composition)).toBeNull();
    expect(latestContext().sources).toHaveLength(12);
    for (const source of latestContext().sources) source.finish();
    expect(audio.play(composition)).not.toBeNull();
    expect(latestContext().sources.filter(source => !source.disconnected)).toHaveLength(1);
  });

  test('volume remains finite, clamps to the UI range, and uses a smoothed master gain', async () => {
    const audio = makeAudio();
    audio.setVolume(0.42);
    await audio.unlock();
    const master = latestContext().gains[0].gain;
    expect(master.value).toBe(0.42);
    audio.setVolume(-1);
    expect(master.value).toBe(0);
    audio.setVolume(2);
    expect(master.value).toBe(1);
    audio.setVolume(Number.NaN);
    expect(Number.isFinite(master.value)).toBe(true);
    expect(master.changes.every(change => change.type === 'target')).toBe(true);
    expect(latestContext().limiters).toHaveLength(1);
  });

  test('dispose settles pending work, removes listeners and defeats late worker/resume callbacks', async () => {
    const audio = makeAudio();
    FakeAudioContext.resumeMode = 'deferred';
    const unlocking = audio.unlock();
    const composition = composeRhythm({ seed: 7 });
    const waiting = audio.prepare(composition);
    const worker = latestWorker();
    const lateHandler = worker.onmessage!;
    expect(fakeDocument.listeners.size).toBe(1);
    audio.dispose();
    audio.dispose();
    expect(await waiting).toBe(false);
    expect(worker.terminated).toBe(true);
    expect(fakeDocument.listeners.size).toBe(0);
    expect(latestContext().closes).toBe(1);
    lateHandler({ data: worker.response() });
    latestContext().finishResume?.();
    expect(await unlocking).toBe(false);
    expect(await audio.prepare(composition)).toBe(false);
    expect(await audio.unlock()).toBe(false);
    expect(audio.play(composition)).toBeNull();
    audio.tap(composition, 0);
    expect(latestContext().sources).toHaveLength(0);
  });
});
