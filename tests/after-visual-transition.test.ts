import { afterEach, beforeEach, expect, test } from 'bun:test';
import { afterVisualTransition } from '../src/shared/afterVisualTransition.ts';

function eventHub() {
  const listeners = new Map<string, Set<(event: Event) => void>>();
  return {
    addEventListener(type: string, listener: (event: Event) => void) {
      let handlers = listeners.get(type);
      if (!handlers) listeners.set(type, handlers = new Set());
      handlers.add(listener);
    },
    removeEventListener(type: string, listener: (event: Event) => void) {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent(event: Event) {
      for (const listener of [...(listeners.get(event.type) ?? [])]) listener(event);
      return true;
    },
    count() { return [...listeners.values()].reduce((sum, handlers) => sum + handlers.size, 0); },
  };
}

function environment() {
  const globalEvents = eventHub();
  const documentEvents = eventHub();
  const attributes = new Set<string>();
  const document = {
    hidden: false,
    prerendering: false,
    get visibilityState() { return this.hidden ? 'hidden' : 'visible'; },
    documentElement: { hasAttribute: (name: string) => attributes.has(name) },
    ...documentEvents,
  };
  let nextFrame = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const microtasks: Array<() => void> = [];
  const replacements = {
    document,
    window: globalEvents,
    addEventListener: globalEvents.addEventListener,
    removeEventListener: globalEvents.removeEventListener,
    dispatchEvent: globalEvents.dispatchEvent,
    requestAnimationFrame(callback: FrameRequestCallback) {
      const id = ++nextFrame;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id: number) { frames.delete(id); },
    queueMicrotask(callback: () => void) { microtasks.push(callback); },
  };
  const originals = new Map(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  return {
    document, attributes, frames, microtasks,
    emit(type: string) { globalEvents.dispatchEvent(new Event(type)); },
    visibility(hidden: boolean) {
      document.hidden = hidden;
      documentEvents.dispatchEvent(new Event('visibilitychange'));
    },
    listenerCount: () => globalEvents.count() + documentEvents.count(),
    flushMicrotasks() {
      let remaining = 100;
      while (microtasks.length && remaining-- > 0) microtasks.shift()!();
      expect(microtasks.length, 'Microtasks must settle without spinning').toBe(0);
    },
    flushFrame() {
      const scheduled = [...frames];
      for (const [id] of scheduled) frames.delete(id);
      for (const [, callback] of scheduled) callback(0);
    },
    restore() {
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

let env: ReturnType<typeof environment>;
beforeEach(() => { env = environment(); });
afterEach(() => { env.restore(); });

test('ordinary hidden documents progress asynchronously without waiting for a paint', () => {
  env.document.hidden = true;
  let calls = 0;
  afterVisualTransition(() => { calls++; });
  expect(calls).toBe(0);
  expect(env.frames.size).toBe(0);
  env.flushMicrotasks();
  expect(calls).toBe(1);
  expect(env.listenerCount()).toBe(0);
  env.visibility(false);
  env.emit('samey-transitionend');
  env.flushMicrotasks();
  env.flushFrame();
  expect(calls).toBe(1);
});

test('cancelling queued hidden work prevents invocation and removes listeners', () => {
  env.document.hidden = true;
  let calls = 0;
  const cancel = afterVisualTransition(() => { calls++; });
  cancel();
  expect(env.listenerCount()).toBe(0);
  env.flushMicrotasks();
  env.visibility(false);
  env.flushFrame();
  expect(calls).toBe(0);
  expect(env.frames.size).toBe(0);
});

test('visible documents still wait for a rendering frame', () => {
  let calls = 0;
  afterVisualTransition(() => { calls++; });
  env.flushMicrotasks();
  expect(calls).toBe(0);
  expect(env.frames.size).toBe(1);
  env.flushFrame();
  expect(calls).toBe(1);
  expect(env.listenerCount()).toBe(0);
});

test('a hidden prerendered document retains the rendering-frame gate', () => {
  env.document.hidden = true;
  env.document.prerendering = true;
  let calls = 0;
  afterVisualTransition(() => { calls++; });
  env.flushMicrotasks();
  env.visibility(true);
  env.flushMicrotasks();
  expect(calls).toBe(0);
  expect(env.frames.size).toBe(1);
  env.document.prerendering = false;
  env.document.hidden = false;
  env.flushFrame();
  expect(calls).toBe(1);
  expect(env.listenerCount()).toBe(0);
});

for (const hidden of [false, true]) {
  for (const [attribute, event] of [
    ['data-samey-route-transition', 'samey-transitionend'],
    ['data-samey-document-transition', 'samey-document-transitionend'],
  ]) {
    test(`${hidden ? 'hidden' : 'visible'} work waits for ${attribute}`, () => {
      env.document.hidden = hidden;
      env.attributes.add(attribute!);
      let calls = 0;
      afterVisualTransition(() => { calls++; });
      env.flushMicrotasks();
      env.flushFrame();
      expect(calls).toBe(0);
      expect(env.listenerCount()).toBeGreaterThan(0);
      env.attributes.delete(attribute!);
      env.emit(event!);
      expect(calls).toBe(0);
      env.flushMicrotasks();
      if (!hidden) {
        expect(calls).toBe(0);
        expect(env.frames.size).toBe(1);
        env.flushFrame();
      }
      expect(calls).toBe(1);
      expect(env.listenerCount()).toBe(0);
    });
  }
}

test('hidden work becoming visible before its microtask waits for a frame', () => {
  env.document.hidden = true;
  let calls = 0;
  afterVisualTransition(() => { calls++; });
  env.document.hidden = false;
  env.flushMicrotasks();
  expect(calls).toBe(0);
  expect(env.frames.size).toBe(1);
  env.flushFrame();
  expect(calls).toBe(1);
  expect(env.listenerCount()).toBe(0);
});

test('a transition starting before the hidden microtask defers work until its end', () => {
  env.document.hidden = true;
  let calls = 0;
  afterVisualTransition(() => { calls++; });
  env.attributes.add('data-samey-document-transition');
  env.flushMicrotasks();
  expect(calls).toBe(0);
  expect(env.frames.size).toBe(0);
  env.attributes.delete('data-samey-document-transition');
  env.emit('samey-document-transitionend');
  env.flushMicrotasks();
  expect(calls).toBe(1);
  expect(env.listenerCount()).toBe(0);
});

test('a transition starting before the visible frame preserves the end-event gate', () => {
  let calls = 0;
  afterVisualTransition(() => { calls++; });
  env.attributes.add('data-samey-route-transition');
  env.flushFrame();
  expect(calls).toBe(0);
  env.attributes.delete('data-samey-route-transition');
  env.emit('samey-transitionend');
  env.flushMicrotasks();
  expect(calls).toBe(0);
  env.flushFrame();
  expect(calls).toBe(1);
  expect(env.listenerCount()).toBe(0);
});

test('hiding an ordinary document releases its pending frame exactly once', () => {
  let calls = 0;
  afterVisualTransition(() => { calls++; });
  expect(env.frames.size).toBe(1);
  env.visibility(true);
  expect(env.frames.size).toBe(0);
  env.flushMicrotasks();
  expect(calls).toBe(1);
  expect(env.listenerCount()).toBe(0);
  env.visibility(false);
  env.visibility(true);
  env.emit('samey-transitionend');
  env.flushMicrotasks();
  env.flushFrame();
  expect(calls).toBe(1);
});

test('cancelling a visible frame removes it and its visibility listener', () => {
  let calls = 0;
  const cancel = afterVisualTransition(() => { calls++; });
  expect(env.frames.size).toBe(1);
  cancel();
  expect(env.frames.size).toBe(0);
  expect(env.listenerCount()).toBe(0);
  env.visibility(true);
  env.flushMicrotasks();
  env.flushFrame();
  expect(calls).toBe(0);
});

test('cancelling a transition wait removes every listener and prevents rescheduling', () => {
  env.attributes.add('data-samey-route-transition');
  let calls = 0;
  const cancel = afterVisualTransition(() => { calls++; });
  expect(env.listenerCount()).toBeGreaterThan(0);
  cancel();
  expect(env.listenerCount()).toBe(0);
  env.attributes.delete('data-samey-route-transition');
  env.emit('samey-transitionend');
  env.visibility(true);
  env.flushMicrotasks();
  env.flushFrame();
  expect(calls).toBe(0);
  expect(env.frames.size).toBe(0);
});
