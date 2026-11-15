import { afterAll, expect, mock, test } from 'bun:test';

// Model Vditor's asynchronous initialization contract: destroy is unsafe before
// its after callback, while Monaco is created synchronously before that callback.
const sessions: Array<{ initialized: boolean; destroyed: number; after: () => void; failDestroy: boolean }> = [];
const resources: Array<{ editorDisposed: boolean; modelDisposed: boolean }> = [];
mock.module('vditor', () => ({ default: class {
  session: (typeof sessions)[number];
  constructor(_host: unknown, options: { after: () => void }) {
    this.session = { initialized: false, destroyed: 0, after: options.after, failDestroy: false };
    sessions.push(this.session);
  }
  destroy() {
    if (!this.session.initialized) throw Error('Vditor has not initialized');
    this.session.destroyed++;
    if (this.session.failDestroy) throw Error('Vditor cleanup failed');
  }
  setTheme() {}
  getValue() { return '# Markdown'; }
  setValue() {}
} }));
mock.module('../src/site/monaco.ts', () => ({
  ensureMonacoLanguage: async () => {},
  monaco: { editor: {
    defineTheme() {}, setTheme() {}, getEditors: () => [],
    createModel() {
      const resource = { editorDisposed: false, modelDisposed: false };
      resources.push(resource);
      return {
        getValue() { if (resource.modelDisposed) throw Error('Model disposed'); return '# Markdown'; },
        onDidChangeContent: () => ({ dispose() {} }),
        dispose() { resource.modelDisposed = true; },
      };
    },
    create() {
      const resource = resources.at(-1)!;
      return { setModel() {}, layout() {}, dispose() { resource.editorDisposed = true; } };
    },
  } },
}));

class FakeElement {
  innerHTML = '';
  dataset = {};
  style = { setProperty() {} };
  setAttribute() {}
  removeAttribute() {}
  addEventListener() {}
  removeEventListener() {}
  querySelectorAll() { return []; }
  querySelector() { return new FakeElement(); }
}
const replacements = {
  document: { documentElement: { classList: { contains: () => false }, dataset: {} }, title: '' },
  location: { origin: 'https://example.test' },
  localStorage: { getItem: () => null, setItem() {} },
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  matchMedia: () => ({ matches: false }),
  addEventListener() {}, removeEventListener() {},
  ResizeObserver: class { observe() {} disconnect() {} },
};
const originals = new Map(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
afterAll(() => {
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});
const { mountTool } = await import('../src/tools/tools.ts');
async function mountMarkdown() {
  const count = sessions.length;
  const dispose = mountTool('markdown', new FakeElement() as unknown as HTMLDivElement, new FakeElement() as unknown as HTMLDivElement);
  for (let attempt = 0; sessions.length === count && attempt < 20; attempt++) await new Promise(resolve => setTimeout(resolve, 0));
  expect(sessions.length).toBe(count + 1);
  return { dispose, session: sessions.at(-1)!, resource: resources.at(-1)! };
}

test('leaving Markdown during initialization disposes Monaco immediately and Vditor when ready', async () => {
  const { dispose, session, resource } = await mountMarkdown();
  dispose();
  expect(resource).toEqual({ editorDisposed: true, modelDisposed: true });
  expect(session.destroyed).toBe(0);
  session.initialized = true;
  expect(() => session.after()).not.toThrow();
  expect(session.destroyed).toBe(1);
});

test('a Vditor teardown failure cannot prevent Monaco cleanup', async () => {
  const { dispose, session, resource } = await mountMarkdown();
  session.initialized = true;
  session.after();
  session.failDestroy = true;
  const log = mock(() => {});
  const original = console.error;
  console.error = log;
  try { dispose(); }
  finally { console.error = original; }
  expect(session.destroyed).toBe(1);
  expect(resource).toEqual({ editorDisposed: true, modelDisposed: true });
  expect(log).toHaveBeenCalledTimes(1);
});
