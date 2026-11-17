import { afterEach, beforeEach, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resilientImport } from '../src/shared/resilientImport.ts';
import { formatThrownError } from '../src/shared/error.ts';

// Run the actual entry with only module fetching, rendering and the frame gate
// substituted. Keeping its promise handlers intact catches unhandled rejections.
const source = readFileSync(new URL('../src/site/main.tsx', import.meta.url), 'utf8')
  .replace(/^import .+ from .+;$/gm, '')
  .replace("  import('@solidjs/web'),", '  loadWeb(),')
  .replace("  import('./App'),", '  loadApp(),');
const compiled = new Bun.Transpiler({ loader: 'tsx' }).transformSync(source);
const runEntry = new Function('onSharedRuntimeReady', 'afterVisualTransition', 'resilientImport', 'formatThrownError', 'loadWeb', 'loadApp', compiled);

function fixture() {
  let activeElement: ElementStub | null = null;
  class ElementStub {
    parentElement: ElementStub | null = null;
    childNodes: ElementStub[] = [];
    attributes = new Map<string, string>();
    listeners = new Map<string, () => void>();
    className = '';
    textContent = '';
    type = '';
    tabIndex = 0;
    constructor(readonly tagName: string) {}
    get isConnected(): boolean { return this === body || !!this.parentElement?.isConnected; }
    hasAttribute(name: string) { return this.attributes.has(name); }
    setAttribute(name: string, value: string) { this.attributes.set(name, value); }
    removeAttribute(name: string) { this.attributes.delete(name); }
    contains(element: ElementStub): boolean { return element === this || this.childNodes.some(child => child.contains(element)); }
    append(...children: ElementStub[]) {
      for (const child of children) { child.remove(); child.parentElement = this; this.childNodes.push(child); }
    }
    replaceChildren(...children: ElementStub[]) {
      for (const child of this.childNodes) child.parentElement = null;
      this.childNodes = [];
      this.append(...children);
    }
    before(element: ElementStub) {
      const parent = this.parentElement!;
      element.remove();
      element.parentElement = parent;
      parent.childNodes.splice(parent.childNodes.indexOf(this), 0, element);
    }
    remove() {
      if (this.parentElement) {
        const siblings = this.parentElement.childNodes;
        siblings.splice(siblings.indexOf(this), 1);
        this.parentElement = null;
      }
    }
    querySelectorAll(selector: string): ElementStub[] {
      const descendants = this.childNodes.flatMap(child => [child, ...child.querySelectorAll('*')]);
      if (selector === '*') return descendants;
      if (selector === 'h1' || selector === 'button') return descendants.filter(child => child.tagName === selector);
      return descendants.filter(child => child.tagName === 'button' || child.tagName === 'a');
    }
    querySelector(selector: string) { return this.querySelectorAll(selector)[0] ?? null; }
    addEventListener(event: string, listener: () => void) { this.listeners.set(event, listener); }
    click() { this.listeners.get('click')?.(); }
    focus() { activeElement = this; }
  }
  const body = new ElementStub('body');
  const root = new ElementStub('div');
  root.setAttribute('data-samey-prerendered', '');
  const original = new ElementStub('a');
  original.textContent = 'Existing page content';
  root.append(original);
  body.append(root);
  const attributes = new Set(['data-site-spa']);
  const document = {
    get activeElement() { return activeElement; },
    documentElement: { hasAttribute: (name: string) => attributes.has(name) },
    getElementById: (id: string) => id === 'site-root' ? root : null,
    createElement: (tag: string) => new ElementStub(tag),
  };
  let ready = () => {};
  let webLoads = 0;
  let appLoads = 0;
  let renders = 0;
  let disposals = 0;
  let reloads = 0;
  const markers = new Map<string, string>();
  let rejectLoad: unknown;
  let rejectPreload: unknown;
  let rejectRender: unknown;
  let deferredLoad: Promise<unknown> | undefined;
  const web = {
    createComponent: (component: () => void) => component(),
    render: (_component: () => unknown, target: ElementStub) => {
      renders++;
      if (rejectRender) { target.append(new ElementStub('div')); throw rejectRender; }
      target.append(new ElementStub('h1'), new ElementStub('button'));
      return () => { disposals++; };
    },
  };
  const site = {
    App: () => {},
    ownsSiteRoute: () => true,
    preloadSiteRoute: () => rejectPreload ? Promise.reject(rejectPreload) : Promise.resolve(),
  };
  const replacements: Record<string, unknown> = {
    document,
    HTMLElement: ElementStub,
    location: { href: 'https://example.com/work/', origin: 'https://example.com', reload: () => { reloads++; } },
    sessionStorage: { getItem: (key: string) => markers.get(key) ?? null, setItem: (key: string, value: string) => { markers.set(key, value); } },
    SameyMountSolid: undefined,
    SameySolidDispose: undefined,
    SameySolidPreload: undefined,
  };
  const originals = new Map(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  runEntry(
    (callback: () => void) => { ready = callback; },
    (callback: () => void) => { let cancelled = false; queueMicrotask(() => { if (!cancelled) callback(); }); return () => { cancelled = true; }; },
    resilientImport,
    formatThrownError,
    () => { webLoads++; return Promise.resolve(web); },
    () => { appLoads++; return deferredLoad ?? (rejectLoad ? Promise.reject(rejectLoad) : Promise.resolve(site)); },
  );
  return {
    root, original, body, site, markers,
    start: () => ready(),
    failLoad: (error: unknown) => { rejectLoad = error; },
    failPreload: (error: unknown) => { rejectPreload = error; },
    failRender: (error: unknown) => { rejectRender = error; },
    deferLoad: (task: Promise<unknown>) => { deferredLoad = task; },
    get counts() { return { webLoads, appLoads, renders, disposals, reloads }; },
    get panel() { return body.childNodes.find(child => child.className === 'site-bootstrap-error'); },
    get active() { return activeElement; },
    restore() {
      globalThis.SameySolidDispose?.();
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

let env: ReturnType<typeof fixture>;
beforeEach(() => { env = fixture(); });
afterEach(() => { env.restore(); });
const settle = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };

test('a rejected bootstrap retains the page and an explicit retry loads a fresh runtime', async () => {
  env.failLoad(new Error('Temporary runtime initialization failure'));
  env.start();
  await settle();
  expect(env.root.childNodes).toEqual([env.original]);
  expect(env.panel?.attributes.get('role')).toBe('alert');
  expect(env.panel?.querySelector('button')?.textContent).toBe('Retry');
  expect(env.counts.appLoads).toBe(1);
  expect(env.counts.reloads).toBe(0);
  env.failLoad(undefined);
  env.panel!.querySelector('button')!.click();
  await settle();
  expect(env.counts.appLoads).toBe(2);
  expect(env.counts.webLoads).toBe(2);
  expect(env.counts.renders).toBe(1);
  expect(env.root.hasAttribute('data-samey-solid-mounted')).toBe(true);
  expect(env.panel).toBeUndefined();
  expect(env.active?.tagName).toBe('h1');
});

test('route preload failures remain visible and repeated retries do not duplicate alerts', async () => {
  env.failPreload(new Error('Route preload failed'));
  env.start();
  await settle();
  env.panel!.querySelector('button')!.click();
  await settle();
  expect(env.root.childNodes).toEqual([env.original]);
  expect(env.body.childNodes.filter(child => child.className === 'site-bootstrap-error')).toHaveLength(1);
  expect(env.counts.appLoads).toBe(1);
  expect(env.counts.renders).toBe(0);
  expect(env.active).toBe(env.panel!.querySelector('button'));
  env.failPreload(undefined);
  env.panel!.querySelector('button')!.click();
  await settle();
  expect(env.counts.renders).toBe(1);
  expect(env.panel).toBeUndefined();
});

test('a synchronous render failure restores the original prerendered nodes for retry', async () => {
  env.failRender(new Error('Render failed'));
  env.start();
  await settle();
  expect(env.root.childNodes).toEqual([env.original]);
  expect(env.root.hasAttribute('data-samey-prerendered')).toBe(true);
  env.failRender(undefined);
  env.panel!.querySelector('button')!.click();
  await settle();
  expect(env.root.querySelector('h1')).not.toBeNull();
  expect(env.panel).toBeUndefined();
});

test('stale hashed imports use the existing single-reload recovery without replacing the page', async () => {
  env.failLoad(new TypeError('Failed to fetch dynamically imported module'));
  env.start();
  await settle();
  expect(env.counts.reloads).toBe(1);
  expect(env.root.childNodes).toEqual([env.original]);
  expect(env.panel).toBeUndefined();
  globalThis.SameyMountSolid?.();
  await settle();
  expect(env.counts.appLoads).toBe(1);
  expect(env.counts.reloads).toBe(1);
});

test('a recent stale-import reload surfaces a retry instead of looping', async () => {
  env.markers.set('samey.stale-import-reload.v1', String(Date.now()));
  env.failLoad(new TypeError('Failed to fetch dynamically imported module'));
  env.start();
  await settle();
  expect(env.counts.reloads).toBe(0);
  expect(env.panel?.querySelector('button')?.textContent).toBe('Retry');
  expect(env.root.childNodes).toEqual([env.original]);
  const reload = env.panel!.querySelectorAll('button').find(button => button.textContent === 'Reload page');
  expect(reload).toBeDefined();
  reload!.click();
  expect(env.counts.reloads).toBe(1);
});

test('disposal during loading prevents a late failure panel', async () => {
  let reject!: (error: Error) => void;
  env.deferLoad(new Promise((_, fail) => { reject = fail; }));
  env.start();
  await settle();
  globalThis.SameySolidDispose?.();
  reject(new Error('Late failed import'));
  await settle();
  expect(env.panel).toBeUndefined();
  expect(env.counts.renders).toBe(0);
  expect(env.root.childNodes).toEqual([env.original]);
});

test('disposal removes an existing recovery panel', async () => {
  env.failLoad(new Error('Runtime unavailable'));
  env.start();
  await settle();
  expect(env.panel).toBeDefined();
  globalThis.SameySolidDispose?.();
  expect(env.panel).toBeUndefined();
});
