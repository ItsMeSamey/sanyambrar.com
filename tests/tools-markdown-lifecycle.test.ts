import { afterAll, expect, mock, test } from 'bun:test';

// Model Vditor's asynchronous initialization contract: destroy is unsafe before
// its after callback, while Monaco is created synchronously before that callback.
const sessions: Array<{ initialized: boolean; destroyed: number; after: () => void; failDestroy: boolean }> = [];
const resources: Array<{ editorDisposed: boolean; modelDisposed: boolean }> = [];
const diffOptions: Array<Record<string, unknown>> = [];
const editorOptions: Array<Record<string, unknown>> = [];
const diffPaneOptions: Array<Record<string, unknown>> = [];
let clipboardAllowed = true;
let clipboardText = '';
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
    createModel(initial: string) {
      const resource = { editorDisposed: false, modelDisposed: false };
      resources.push(resource);
      let value = initial;
      const changes = new Set<() => void>();
      return {
        getValue() { if (resource.modelDisposed) throw Error('Model disposed'); return value; },
        getLineCount: () => value.split('\n').length,
        getLineContent: (line: number) => value.split('\n')[line - 1],
        setValue(next: string) { value = next; for (const change of changes) change(); },
        onDidChangeContent(change: () => void) { changes.add(change); return { dispose() { changes.delete(change); } }; },
        dispose() { resource.modelDisposed = true; },
      };
    },
    create(_host: unknown, options: Record<string, unknown>) {
      editorOptions.push(options);
      const resource = resources.at(-1)!;
      return { setModel() {}, layout() {}, deltaDecorations: () => [], dispose() { resource.editorDisposed = true; } };
    },
    createDiffEditor(_host: unknown, options: Record<string, unknown>) {
      diffOptions.push(options);
      return {
        setModel() {}, dispose() {},
        getOriginalEditor: () => ({ updateOptions(options: Record<string, unknown>) { diffPaneOptions.push(options); } }),
        getModifiedEditor: () => ({ updateOptions(options: Record<string, unknown>) { diffPaneOptions.push(options); } }),
      };
    },
  } },
}));

class FakeElement {
  innerHTML = '';
  textContent = '';
  value = '';
  disabled = false;
  dataset: Record<string, string> = {};
  style = { setProperty() {} };
  classList = { add() {}, remove() {}, toggle() {} };
  children = new Map<string, FakeElement>();
  listeners = new Map<string, (event: { target: FakeElement }) => void>();
  onclick?: () => void;
  setAttribute() {}
  removeAttribute() {}
  addEventListener(type: string, listener: (event: { target: FakeElement }) => void) { this.listeners.set(type, listener); }
  removeEventListener() {}
  querySelectorAll() { return []; }
  closest() { return this; }
  querySelector(selector: string): FakeElement {
    if (!this.children.has(selector)) this.children.set(selector, new FakeElement());
    return this.children.get(selector)!;
  }
}
const stored = new Map<string, string>();
const replacements = {
  document: { documentElement: { classList: { contains: () => false }, dataset: {} }, title: '' },
  Element: FakeElement,
  navigator: { clipboard: { async writeText(text: string) { if (!clipboardAllowed) throw Error('Denied'); clipboardText = text; } } },
  location: { origin: 'https://example.test' },
  localStorage: { getItem: (key: string) => stored.get(key) ?? null, setItem(key: string, value: string) { stored.set(key, value); } },
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
  expect(editorOptions.at(-1)?.ariaLabel).toBe('Markdown source');
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

test('the mounted diff compares meaningful indentation and trailing whitespace', async () => {
  const count = diffOptions.length;
  const dispose = mountTool('diff', new FakeElement() as unknown as HTMLDivElement, new FakeElement() as unknown as HTMLDivElement);
  try {
    for (let attempt = 0; diffOptions.length === count && attempt < 20; attempt++) await new Promise(resolve => setTimeout(resolve, 0));
    expect(diffOptions.length).toBe(count + 1);
    expect(diffOptions.at(-1)?.ignoreTrimWhitespace).toBe(false);
    expect(diffPaneOptions.slice(-2).map(options => options.ariaLabel)).toEqual(['Original text', 'Modified text']);
  } finally { dispose(); }
});

test('codec copy reports clipboard outcomes and invalid input disables copying', async () => {
  for (const [text, allowed, expected, disabled] of [
    ['MY======', true, 'Copied.', false],
    ['MY======', false, 'Could not copy. Select the output and copy it manually.', false],
    ['MY=', true, '', true],
  ] as const) {
    stored.set('tool.base.format', 'base32');
    stored.set('tool.base.text', text);
    clipboardAllowed = allowed;
    const root = new FakeElement();
    const dispose = mountTool('base', root as unknown as HTMLDivElement, new FakeElement() as unknown as HTMLDivElement);
    try {
      for (let attempt = 0; !root.children.has('[data-codec-copy]') && attempt < 20; attempt++) await new Promise(resolve => setTimeout(resolve, 0));
      const button = root.querySelector('[data-codec-copy]');
      expect(editorOptions.slice(-2).map(options => options.ariaLabel)).toEqual(['Codec input', 'Codec output']);
      expect(button.disabled).toBe(disabled);
      button.onclick?.();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(root.querySelector('[data-copy-status]').textContent).toBe(expected);
      if (!disabled && allowed) expect(clipboardText).toBe('f');
      if (disabled) expect(root.querySelector('[data-codec-status]').textContent).toBe('Invalid Base32');
      expect(root.innerHTML).toContain('data-copy-status role="status"');
    } finally { dispose(); }
  }
});

test('the text editor exposes its input purpose to assistive technology', async () => {
  stored.set('tool.text.text', '');
  const count = editorOptions.length;
  const dispose = mountTool('text', new FakeElement() as unknown as HTMLDivElement, new FakeElement() as unknown as HTMLDivElement);
  try {
    for (let attempt = 0; editorOptions.length === count && attempt < 20; attempt++) await new Promise(resolve => setTimeout(resolve, 0));
    expect(editorOptions.length).toBe(count + 1);
    expect(editorOptions.at(-1)?.ariaLabel).toBe('Text input');
  } finally { dispose(); }
});

test('number copy reports denied and successful raw-value writes', async () => {
  for (const allowed of [false, true]) {
    clipboardAllowed = allowed;
    const root = new FakeElement();
    const dispose = mountTool('number', root as unknown as HTMLDivElement, new FakeElement() as unknown as HTMLDivElement);
    try {
      const grid = root.querySelector('.number-grid');
      const button = grid.querySelector('[data-number-card="decimal"]').querySelector('[data-copy-number]');
      grid.listeners.get('click')?.({ target: button });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(root.querySelector('[data-copy-status]').textContent).toBe(allowed ? 'Copied.' : 'Could not copy. Select the output and copy it manually.');
      if (allowed) expect(clipboardText).toBe('255');
      expect(root.innerHTML).toContain('data-copy-status role="status"');
    } finally { dispose(); }
  }
});
