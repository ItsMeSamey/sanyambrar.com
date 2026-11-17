import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Hold the actual component's deferred setup and invoke its handlers directly.
// Canvas geometry and pixels still require independent browser validation.
const source = readFileSync(new URL('../src/site/components/CnnDemo.tsx', import.meta.url), 'utf8');
const program = ts.createSourceFile('CnnDemo.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = program.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'CnnDemo') as ts.FunctionDeclaration;
const prelude = program.statements.filter(node => !ts.isImportDeclaration(node) && node !== component && !(ts.isFunctionDeclaration(node) && node.name?.text === 'preloadCnnDemoAssets')).map(node => node.getText(program)).join('\n');
const body = component.body!.statements.filter(node => !ts.isReturnStatement(node)).map(node => node.getText(program)).join('\n');
const code = ts.transpileModule(`${prelude}\nfunction CnnDemo() { ${body}\nreturn { bindCanvas(value) { canvas = value; }, beginStroke, moveStroke, onInkInput, clear, ready, workerFailure, modelLoading, startWorker, scores }; } CnnDemo();`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function harness(failure?: 'drawing' | 'sampling' | 'worker') {
  let settled = () => {};
  let setup = () => {};
  let cleanup = () => {};
  let cancelled = false;
  let terminated = false;
  let timerId = 0;
  let frameId = 0;
  let clears = 0;
  let boundsReads = 0;
  const timers = new Map<number, { callback: () => void; delay: number }>();
  const frames = new Map<number, () => void>();
  const workers: Array<{ emit: (name: string, event: unknown) => void; sent: any[]; terminated: boolean }> = [];
  const listeners = new Map<string, () => void>();
  const points: number[][] = [];
  const draw = {
    beginPath() {}, arc: (x: number, y: number) => points.push([x, y]), fill() {},
    moveTo() {}, lineTo: (x: number, y: number) => points.push([x, y]), stroke() {},
    save() {}, restore() {}, clearRect() { clears++; },
    drawImage() {}, getImageData: () => ({ data: new Uint8Array(28 * 28 * 4).fill(255) }),
  };
  let captures = 0;
  let top = 0;
  const canvas = {
    isConnected: true, getContext: () => failure === 'drawing' ? null : draw,
    getBoundingClientRect: () => { boundsReads++; return { left: 0, top, width: 280, height: 280 }; },
    setPointerCapture() { captures++; }, hasPointerCapture: () => false,
    toggleAttribute() {}, removeAttribute() {},
  };
  const scope = {
    createSignal: (initial: any) => { let value = initial; return [() => value, (next: any) => { value = next; }]; },
    onSettled: (callback: () => void) => { settled = callback; },
    onCleanup: (callback: () => void) => { cleanup = callback; },
    afterVisualTransition: (callback: () => void) => { setup = callback; return () => { cancelled = true; }; },
    formatThrownError: (error: Error) => error.message,
    document: { documentElement: {}, createElement: () => ({ getContext: () => failure === 'sampling' ? null : draw }) },
    getComputedStyle: () => ({ getPropertyValue: () => '#777' }),
    window: { addEventListener: (name: string, listener: () => void) => listeners.set(name, listener), removeEventListener: (name: string) => listeners.delete(name) },
    ResizeObserver: class { observe() {} disconnect() {} },
    CnnWorker: class {
      callbacks = new Map<string, (event: unknown) => void>();
      sent: any[] = [];
      terminated = false;
      constructor() { if (failure === 'worker') throw new Error('worker unavailable'); workers.push(this); }
      addEventListener(name: string, callback: (event: unknown) => void) { this.callbacks.set(name, callback); }
      emit(name: string, event: unknown) { this.callbacks.get(name)?.(event); }
      postMessage(message: unknown) { this.sent.push(message); }
      terminate() { terminated = true; this.terminated = true; }
    },
    setTimeout(callback: () => void, delay: number) { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimeout(id: number) { timers.delete(id); },
    requestAnimationFrame(callback: () => void) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id: number) { frames.delete(id); },
    console: { error() {} },
  };
  const component = runInNewContext(code, scope) as Record<string, (...args: any[]) => any>;
  component.bindCanvas(canvas);
  const event = (y: number) => ({ button: 0, pointerId: 1, clientX: 20, clientY: y, preventDefault() {} });
  return {
    component, listeners, points, event, workers, timers, frames,
    defer() { settled(); }, start() { setup(); }, cleanup() { cleanup(); },
    flushFrames() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); },
    scroll(value: number) { top = value; listeners.get('scroll')?.(); },
    reposition(value: number) { top = value; },
    get captures() { return captures; }, get cancelled() { return cancelled; }, get terminated() { return terminated; },
    get clears() { return clears; },
    get boundsReads() { return boundsReads; },
  };
}

test('CNN ignores drawing, intensity, and clear until deferred initialization completes', () => {
  const h = harness();
  h.defer();
  expect(h.component.ready()).toBe(false);
  expect(() => {
    h.component.beginStroke(h.event(20));
    h.component.onInkInput({ currentTarget: { value: '80' } });
    h.component.clear();
  }).not.toThrow();
  expect(h.captures).toBe(0);
  h.start();
  expect(h.component.ready()).toBe(true);
  h.component.beginStroke(h.event(20));
  expect(h.captures).toBe(1);
  expect(h.points).toEqual([[20, 20]]);
  h.cleanup();
  expect(h.cancelled).toBe(true);
  expect(h.terminated).toBe(true);
  expect(h.listeners.size).toBe(0);
});

for (const failure of ['drawing', 'sampling'] as const) {
  test(`CNN displays deferred ${failure} setup failure without escaping the callback`, () => {
    const h = harness(failure);
    h.defer();
    expect(() => h.start()).not.toThrow();
    expect(h.component.workerFailure()).toContain('unavailable');
    expect(h.component.ready()).toBe(false);
    expect(h.listeners.size).toBe(0);
    h.component.beginStroke(h.event(20));
    expect(h.captures).toBe(0);
  });
}

test('CNN worker construction failure keeps drawing available for model retry', () => {
  const h = harness('worker');
  h.defer(); h.start();
  expect(h.component.workerFailure()).toContain('unavailable');
  expect(h.component.modelLoading()).toBe(false);
  expect(h.component.ready()).toBe(true);
  h.component.beginStroke(h.event(20));
  expect(h.points).toEqual([[20, 20]]);
  expect(h.timers.size).toBe(0);
  h.cleanup();
});

test('CNN bounds silent startup and retries the existing drawing without accepting stale callbacks', () => {
  const h = harness();
  h.defer(); h.start();
  expect(h.component.modelLoading()).toBe(true);
  h.component.beginStroke(h.event(20));
  const timeout = [...h.timers.values()][0]!;
  expect(timeout.delay).toBeGreaterThan(0);
  expect(timeout.delay).toBeLessThanOrEqual(15_000);
  timeout.callback();
  expect(h.component.workerFailure()).toContain('too long');
  expect(h.component.modelLoading()).toBe(false);
  expect(h.workers[0]!.terminated).toBe(true);
  expect(h.timers.size).toBe(0);
  h.component.startWorker();
  expect(h.workers).toHaveLength(2);
  expect(h.clears).toBe(0);
  expect(h.component.workerFailure()).toBe(null);
  expect(h.component.modelLoading()).toBe(true);
  h.workers[0]!.emit('message', { data: { type: 'ready' } });
  h.workers[0]!.emit('error', { message: 'obsolete failure' });
  timeout.callback();
  expect(h.component.modelLoading()).toBe(true);
  expect(h.component.workerFailure()).toBe(null);
  h.workers[1]!.emit('message', { data: { type: 'ready' } });
  expect(h.component.modelLoading()).toBe(false);
  expect(h.timers.size).toBe(0);
  h.flushFrames();
  const prediction = h.workers[1]!.sent[0];
  expect(prediction.type).toBe('predict');
  expect([...prediction.input]).toEqual(Array(784).fill(255));
  h.workers[1]!.emit('message', { data: { type: 'result', id: prediction.id, classId: 2, probabilities: Array(11).fill(0.1) } });
  expect(h.component.scores()[2]).toBe(0.1);
  h.cleanup();
});

test('CNN startup errors and unmount clear deadlines and reject late callbacks', () => {
  for (const error of ['protocol', 'runtime'] as const) {
    const h = harness();
    h.defer(); h.start();
    if (error === 'protocol') h.workers[0]!.emit('message', { data: { type: 'error', message: 'failed', detail: 'fetch failed' } });
    else h.workers[0]!.emit('error', { message: 'runtime failed' });
    expect(h.timers.size).toBe(0);
    expect(h.component.modelLoading()).toBe(false);
    expect(h.component.workerFailure()).toContain('failed');
    h.component.startWorker();
    const timeout = [...h.timers.values()][0]!;
    h.cleanup();
    expect(h.timers.size).toBe(0);
    expect(h.workers[1]!.terminated).toBe(true);
    timeout.callback();
    h.workers[1]!.emit('message', { data: { type: 'ready' } });
    h.workers[1]!.emit('error', { message: 'late failure' });
    h.component.startWorker();
    expect(h.workers).toHaveLength(2);
    expect(h.component.workerFailure()).toBe(null);
    expect(h.frames.size).toBe(0);
  }
});

test('CNN invalidates cached drawing coordinates when a captured stroke scrolls', () => {
  const h = harness();
  h.defer(); h.start();
  h.component.beginStroke(h.event(20));
  h.scroll(-100);
  h.component.moveStroke(h.event(20));
  expect(h.points).toEqual([[20, 20], [20, 120]]);
  h.cleanup();
});

test('CNN keeps an active stroke aligned through position-only changes and model state transitions', () => {
  const h = harness();
  h.defer(); h.start();
  h.reposition(100);
  h.component.beginStroke(h.event(120));
  expect(h.points).toEqual([[20, 20]]);
  expect(h.boundsReads).toBe(1);

  h.workers[0]!.emit('message', { data: { type: 'ready' } });
  h.reposition(50);
  h.component.moveStroke({ ...h.event(125), getCoalescedEvents: () => [h.event(120), h.event(125)] });
  expect(h.points.slice(1)).toEqual([[20, 70], [20, 75]]);
  expect(h.boundsReads).toBe(2);
  h.component.moveStroke(h.event(130));
  expect(h.points.at(-1)).toEqual([20, 80]);
  expect(h.boundsReads).toBe(2);

  h.workers[0]!.emit('error', { message: 'model failed' });
  h.reposition(20);
  h.component.moveStroke(h.event(120));
  expect(h.points.at(-1)).toEqual([20, 100]);

  h.component.startWorker();
  h.reposition(60);
  h.component.moveStroke(h.event(120));
  expect(h.points.at(-1)).toEqual([20, 60]);
  h.workers[1]!.emit('message', { data: { type: 'ready' } });
  h.reposition(80);
  h.component.moveStroke(h.event(120));
  expect(h.points.at(-1)).toEqual([20, 40]);
  expect(h.boundsReads).toBe(5);
  expect(h.captures).toBe(1);
  expect(h.clears).toBe(0);
  h.cleanup();
});
