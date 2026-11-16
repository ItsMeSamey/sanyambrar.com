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
const code = ts.transpileModule(`${prelude}\nfunction CnnDemo() { ${body}\nreturn { bindCanvas(value) { canvas = value; }, beginStroke, moveStroke, onInkInput, clear, ready, workerFailure }; } CnnDemo();`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function harness(failure?: 'drawing' | 'sampling' | 'worker') {
  let settled = () => {};
  let setup = () => {};
  let cleanup = () => {};
  let cancelled = false;
  let terminated = false;
  const listeners = new Map<string, () => void>();
  const points: number[][] = [];
  const draw = {
    beginPath() {}, arc: (x: number, y: number) => points.push([x, y]), fill() {},
    moveTo() {}, lineTo: (x: number, y: number) => points.push([x, y]), stroke() {},
    save() {}, restore() {}, clearRect() {},
  };
  let captures = 0;
  let top = 0;
  const canvas = {
    isConnected: true, getContext: () => failure === 'drawing' ? null : draw,
    getBoundingClientRect: () => ({ left: 0, top, width: 280, height: 280 }),
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
    CnnWorker: class { constructor() { if (failure === 'worker') throw new Error('worker unavailable'); } addEventListener() {} terminate() { terminated = true; } },
    cancelAnimationFrame() {},
  };
  const component = runInNewContext(code, scope) as Record<string, (...args: any[]) => any>;
  component.bindCanvas(canvas);
  const event = (y: number) => ({ button: 0, pointerId: 1, clientX: 20, clientY: y, preventDefault() {} });
  return {
    component, listeners, points, event,
    defer() { settled(); }, start() { setup(); }, cleanup() { cleanup(); },
    scroll(value: number) { top = value; listeners.get('scroll')?.(); },
    get captures() { return captures; }, get cancelled() { return cancelled; }, get terminated() { return terminated; },
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

for (const failure of ['drawing', 'sampling', 'worker'] as const) {
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

test('CNN invalidates cached drawing coordinates when a captured stroke scrolls', () => {
  const h = harness();
  h.defer(); h.start();
  h.component.beginStroke(h.event(20));
  h.scroll(-100);
  h.component.moveStroke(h.event(20));
  expect(h.points).toEqual([[20, 20], [20, 120]]);
  h.cleanup();
});
