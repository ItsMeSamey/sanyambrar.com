import { expect, test } from 'bun:test';
import { createStylesheetManager } from '../src/shared/stylesheets.ts';

class StyleDocument {
  baseURI = 'https://example.test/projects/reverb/';
  links: StyleLink[] = [];
  head = {
    append: (link: StyleLink) => {
      link.isConnected = true;
      this.links.push(link);
    },
  };
  createElement(tag: string) {
    expect(tag).toBe('link');
    return new StyleLink(this);
  }
  querySelectorAll(selector: string) {
    if (selector === 'link[data-samey-route-style][href]')
      return this.links.filter(link => link.href && link.hasAttribute('data-samey-route-style'));
    if (selector === 'link[rel="stylesheet"][href]')
      return this.links.filter(link => link.rel === 'stylesheet' && link.href);
    throw new Error(`Unexpected stylesheet selector: ${selector}`);
  }
}

class StyleLink extends EventTarget {
  href = '';
  rel = 'stylesheet';
  media = '';
  integrity = '';
  crossOrigin = '';
  title = '';
  dataset: Record<string, string> = {};
  sheet: object | null = null;
  isConnected = false;
  constructor(readonly ownerDocument: StyleDocument) { super(); }
  hasAttribute(name: string) {
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
      return Object.hasOwn(this.dataset, key);
    }
    return name === 'href' ? !!this.href : name === 'rel' ? !!this.rel : name === 'media' ? !!this.media : false;
  }
  cloneNode() {
    const clone = new StyleLink(this.ownerDocument);
    for (const key of ['href', 'rel', 'media', 'integrity', 'crossOrigin', 'title'] as const) clone[key] = this[key];
    clone.dataset = { ...this.dataset };
    return clone;
  }
  replaceWith(replacement: StyleLink) {
    const index = this.ownerDocument.links.indexOf(this);
    expect(index).toBeGreaterThanOrEqual(0);
    this.isConnected = false;
    replacement.isConnected = true;
    this.ownerDocument.links.splice(index, 1, replacement);
  }
  remove() {
    const index = this.ownerDocument.links.indexOf(this);
    if (index !== -1) this.ownerDocument.links.splice(index, 1);
    this.isConnected = false;
  }
  loaded() {
    this.sheet = {};
    this.dispatchEvent(new Event('load'));
  }
  failed() { this.dispatchEvent(new Event('error')); }
}

function fixture() {
  const document = new StyleDocument();
  const manager = createStylesheetManager(document as unknown as Document);
  const absolute = (href: string) => new URL(href, document.baseURI).href;
  const find = (href: string) => {
    const link = document.links.find(link => link.href === absolute(href));
    expect(link).toBeDefined();
    return link!;
  };
  const seed = (href: string, options: { loaded?: boolean; media?: string; owner?: string; shared?: boolean } = {}) => {
    const link = new StyleLink(document);
    link.href = absolute(href);
    link.media = options.media ?? 'all';
    if (options.loaded !== false) link.sheet = {};
    if (options.owner) Object.assign(link.dataset, { sameyRouteStyle: '', sameyRouteOwner: options.owner });
    if (options.shared) link.dataset.sameyShared = '';
    document.head.append(link);
    return link;
  };
  return { document, manager, find, seed, absolute };
}

async function flushPromises() {
  for (let tick = 0; tick < 5; tick++) await Promise.resolve();
}

const engineHref = '/site-chunks/reverb-engine.css';

test('project hover stages engine CSS and Work activation leaves it inactive until the component claims it', async () => {
  const { document, manager, find, seed } = fixture();
  const home = seed('/home.css', { owner: 'home' });
  let hoverReady = false;
  const hover = manager.prepare([engineHref], 'project:reverb').then(prepared => { hoverReady = true; return prepared; });
  const engine = find(engineHref);
  expect(engine.media).toBe('not all');
  expect(engine.hasAttribute('data-samey-component-style')).toBe(false);

  const workTask = manager.prepare(['/work.css'], 'work');
  find('/work.css').loaded();
  const work = await workTask;
  manager.activateRoute(work);
  expect(find('/work.css').media).toBe('all');
  expect(home.media).toBe('not all');
  expect(engine.media).toBe('not all');

  let componentReady = false;
  const componentTask = manager.prepare([engineHref], 'demo:reverb').then(prepared => { componentReady = true; return prepared; });
  await flushPromises();
  expect(hoverReady).toBe(false);
  expect(componentReady).toBe(false);
  expect(document.links.filter(link => link.href === engine.href)).toHaveLength(1);
  engine.loaded();
  const [warmed, component] = await Promise.all([hover, componentTask]);
  expect(warmed.links[0]).toBe(component.links[0]);
  expect(engine.media).toBe('not all');
  manager.activateComponent(component, 'demo:reverb');
  expect(engine.media).toBe('all');
  expect(engine.dataset.sameyComponentStyle).toBe('demo:reverb');
});

test('Writing and Tools retire route-only CSS while claimed component CSS remains active', async () => {
  const { manager, find } = fixture();
  const componentTask = manager.prepare([engineHref], 'demo:reverb');
  find(engineHref).loaded();
  manager.activateComponent(await componentTask, 'demo:reverb');
  const engine = find(engineHref);
  let previous: StyleLink | undefined;
  for (const owner of ['work', 'writing', 'tools']) {
    const routeTask = manager.prepare([`/${owner}.css`], owner);
    const current = find(`/${owner}.css`);
    current.loaded();
    manager.activateRoute(await routeTask);
    expect(current.media).toBe('all');
    expect(engine.media).toBe('all');
    expect(engine.dataset.sameyComponentStyle).toBe('demo:reverb');
    if (previous) expect(previous.media).toBe('not all');
    previous = current;
  }
});

test('cached component remount reuses one connected stylesheet without another load event', async () => {
  const { document, manager, find } = fixture();
  const firstTask = manager.prepare([engineHref], 'demo:reverb');
  const link = find(engineHref);
  link.loaded();
  manager.activateComponent(await firstTask, 'demo:reverb');
  manager.activateRoute(await manager.prepare([], 'writing'));
  const remounted = await manager.prepare([engineHref], 'demo:reverb');
  manager.activateComponent(remounted, 'demo:reverb');
  expect(remounted.links[0]).toBe(link as unknown as HTMLLinkElement);
  expect(document.links).toHaveLength(1);
  expect(link.media).toBe('all');
});

test('loaded native or Vite stylesheets are adopted without duplication or position changes', async () => {
  const { document, manager, seed } = fixture();
  const before = seed('/shared.css', { shared: true });
  const native = seed(engineHref);
  const after = seed('/other.css');
  const prepared = await manager.prepare([engineHref], 'demo:reverb');
  expect(prepared.links[0]).toBe(native as unknown as HTMLLinkElement);
  expect(document.links).toEqual([before, native, after]);
  expect(native.dataset.sameyRouteStyle).toBe('');
  manager.activateComponent(prepared, 'demo:reverb');
  manager.activateRoute(await manager.prepare([], 'writing'));
  expect(native.media).toBe('all');
});

test('duplicate relative and absolute assets share one pending request across consumers', async () => {
  const { document, manager, find, absolute } = fixture();
  let firstReady = false;
  let secondReady = false;
  const first = manager.prepare([engineHref, absolute(engineHref)], 'project').then(prepared => { firstReady = true; return prepared; });
  const second = manager.prepare([absolute(engineHref)], 'demo').then(prepared => { secondReady = true; return prepared; });
  await flushPromises();
  expect(document.links).toHaveLength(1);
  expect(firstReady).toBe(false);
  expect(secondReady).toBe(false);
  const link = find(engineHref);
  link.loaded();
  const [a, b] = await Promise.all([first, second]);
  expect(a.desired.size).toBe(1);
  expect(a.links).toHaveLength(1);
  expect(a.links[0]).toBe(b.links[0]);
});

test('concurrent stylesheet failure rejects both consumers, removes the link, and allows fresh retry', async () => {
  const { document, manager, find } = fixture();
  const first = manager.prepare([engineHref], 'project');
  const second = manager.prepare([engineHref], 'demo');
  const settled = Promise.allSettled([first, second]);
  const failed = find(engineHref);
  failed.failed();
  const results = await settled;
  expect(results.every(result => result.status === 'rejected')).toBe(true);
  for (const result of results) {
    if (result.status === 'rejected') expect((result.reason as Error).message).toContain(engineHref);
  }
  expect(failed.isConnected).toBe(false);
  expect(document.links).toHaveLength(0);
  const retryTask = manager.prepare([engineHref], 'demo');
  const retry = find(engineHref);
  expect(retry).not.toBe(failed);
  expect(retry.media).toBe('not all');
  retry.loaded();
  const prepared = await retryTask;
  expect(prepared.links[0]).toBe(retry as unknown as HTMLLinkElement);
});

for (const initialState of ['pending', 'failed']) {
  test(`untracked ${initialState} initial stylesheet is cloned in place without losing media or attributes`, async () => {
    const { document, manager, find, seed } = fixture();
    const before = seed('/before.css');
    const initial = seed(engineHref, { loaded: false, media: 'print', owner: 'project' });
    initial.integrity = 'sha256-preserved';
    initial.crossOrigin = 'anonymous';
    initial.title = 'Engine';
    initial.dataset.qaStyle = 'initial';
    const after = seed('/after.css');
    if (initialState === 'failed') initial.failed();
    let ready = false;
    const task = manager.prepare([engineHref], 'demo').then(prepared => { ready = true; return prepared; });
    const replacement = find(engineHref);
    expect(replacement).not.toBe(initial);
    expect(initial.isConnected).toBe(false);
    expect(document.links).toEqual([before, replacement, after]);
    expect(replacement.media).toBe('print');
    expect(replacement.integrity).toBe(initial.integrity);
    expect(replacement.crossOrigin).toBe(initial.crossOrigin);
    expect(replacement.title).toBe(initial.title);
    expect(replacement.dataset.qaStyle).toBe('initial');
    expect(replacement.dataset.sameyRouteOwner).toBe('project');
    initial.loaded();
    await flushPromises();
    expect(ready).toBe(false);
    replacement.loaded();
    const prepared = await task;
    expect(prepared.links[0]).toBe(replacement as unknown as HTMLLinkElement);
    expect(replacement.media).toBe('print');
  });
}

test('route and component activation leave the shared render-blocking stylesheet unchanged', async () => {
  const { manager, find, seed } = fixture();
  const shared = seed('/shared/site.css', { shared: true, media: 'screen' });
  const sharedDataset = { ...shared.dataset };
  const routeTask = manager.prepare(['/work.css'], 'work');
  find('/work.css').loaded();
  manager.activateRoute(await routeTask);
  const componentTask = manager.prepare([engineHref], 'demo:reverb');
  find(engineHref).loaded();
  manager.activateComponent(await componentTask, 'demo:reverb');
  manager.activateRoute(await manager.prepare([], 'writing'));
  expect(shared.media).toBe('screen');
  expect(shared.dataset).toEqual(sharedDataset);
  expect(shared.isConnected).toBe(true);
});

test('a detached cached stylesheet is replaced and the replacement must finish loading', async () => {
  const { document, manager, find } = fixture();
  const firstTask = manager.prepare([engineHref], 'demo:reverb');
  const first = find(engineHref);
  first.loaded();
  manager.activateComponent(await firstTask, 'demo:reverb');
  first.remove();
  let ready = false;
  const replacementTask = manager.prepare([engineHref], 'demo:reverb').then(prepared => { ready = true; return prepared; });
  const replacement = find(engineHref);
  expect(replacement).not.toBe(first);
  expect(document.links).toHaveLength(1);
  expect(replacement.media).toBe('not all');
  first.loaded();
  await flushPromises();
  expect(ready).toBe(false);
  replacement.loaded();
  manager.activateComponent(await replacementTask, 'demo:reverb');
  expect(replacement.media).toBe('all');
  expect(replacement.dataset.sameyComponentStyle).toBe('demo:reverb');
});
