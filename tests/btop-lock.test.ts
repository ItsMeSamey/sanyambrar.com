import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.createSourceFile('btop-lock.ts', readFileSync(new URL('../src/blogs/btop-lock.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
const runtime = ts.transpileModule(source.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(source)).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const html = readFileSync(new URL('../src/blogs/btop-mutex.html', import.meta.url), 'utf8');
type EventStub = { key?: string; target?: ElementStub; defaultPrevented?: boolean; preventDefault?: () => void; [key: string]: unknown };
class ElementStub {
  textContent = '';
  innerHTML = '';
  className = '';
  editable = false;
  dataset: Record<string, string> = {};
  children: unknown[] = [];
  attributes = new Map<string, string>();
  listeners = new Map<string, (event: EventStub) => void>();
  queries = new Map<string, ElementStub>();
  queryLists = new Map<string, ElementStub[]>();
  classes = new Set<string>();
  classList = { toggle: (name: string, value: boolean) => { if (value) this.classes.add(name); else this.classes.delete(name); } };
  querySelector(selector: string) { return this.queries.get(selector) ?? null; }
  querySelectorAll(selector: string) { return this.queryLists.get(selector) ?? []; }
  closest() { return this.editable ? this : null; }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  addEventListener(name: string, callback: (event: EventStub) => void) { this.listeners.set(name, callback); }
  replaceChildren(...children: unknown[]) { this.children = children; }
  dispatch(name: string, event: EventStub = {}) { this.listeners.get(name)?.(event); }
}

// Execute the actual article handlers with deterministic DOM and clock substitutes.
// Layout, painting and screen-reader output remain browser checks.
function harness() {
  const nodes = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(match => [match[1], new ElementStub()]));
  const get = (id: string) => {
    const node = nodes.get(id);
    if (!node) throw new Error(`Article is missing #${id}`);
    return node;
  };
  const root = get('cas-viz');
  const jumps = [...html.matchAll(/data-cas-jump="(\d+)"/g)].map(match => {
    const node = new ElementStub();
    node.dataset.casJump = match[1];
    return node;
  });
  root.queryLists.set('[data-cas-jump]', jumps);
  get('owner-slots').children = [new ElementStub(), new ElementStub()];
  get('cas-event').queries.set('.event-tag', new ElementStub());
  get('cas-play').queries.set('.control-icon', new ElementStub());
  for (const name of ['previous', 'next', 'reset']) root.queries.set(`[data-cas-icon="${name}"]`, new ElementStub());
  const orders = ['old', 'fixed'].map(order => {
    const node = new ElementStub();
    node.dataset.order = order;
    return node;
  });
  get('ordering-viz').queryLists.set('[data-order]', orders);
  const document = Object.assign(new ElementStub(), { hidden: false, getElementById: (id: string) => nodes.get(id) ?? null });
  const lifecycle = new ElementStub();
  let visibility: (entries: { isIntersecting: boolean }[]) => void = () => {};
  let sequence = 0;
  const timers = new Map<number, () => void>();
  runInNewContext(runtime, {
    document, Element: ElementStub,
    highlightArticleCode() {},
    ArrowRight: 'arrow', ChevronLeft: 'previous', ChevronRight: 'next', Pause: 'pause', Play: 'play', RotateCcw: 'reset', X: 'x',
    createElement: (icon: string) => ({ icon }),
    addEventListener: lifecycle.addEventListener.bind(lifecycle),
    setInterval(callback: () => void) { timers.set(++sequence, callback); return sequence; },
    clearInterval(id: number) { timers.delete(id); },
    IntersectionObserver: class { constructor(callback: typeof visibility) { visibility = callback; } observe() {} },
  });
  return {
    get, jumps, orders, timers, document, lifecycle,
    click(id: string) { get(id).dispatch('click'); },
    tick() { for (const callback of [...timers.values()]) callback(); },
    offscreen() { visibility([{ isIntersecting: false }]); },
    key(key: string, extra: EventStub = {}) {
      let prevented = false;
      root.dispatch('keydown', { key, target: root, preventDefault() { prevented = true; }, ...extra });
      return prevented;
    },
  };
}

test('CAS trace preserves the failed expected update and the successful true-to-true exchange', () => {
  const h = harness();
  expect(h.get('cas-prev').attributes.get('aria-disabled')).toBe('true');
  h.jumps[4].dispatch('click');
  expect(h.get('b-expected').textContent).toBe('true');
  expect(h.get('owners').textContent).toBe('1 owner');
  expect(h.get('b-instruction').textContent).toContain('fail');
  h.click('cas-step');
  expect(h.get('b-instruction').textContent).toBe('CAS(true → true) → success');
  expect(h.get('owners').textContent).toBe('1 owner');
  h.click('cas-step');
  expect(h.get('owners').textContent).toBe('2 owners');
  expect(h.get('cas-step').attributes.get('aria-disabled')).toBe('true');
  expect(h.get('cas-play-label').textContent).toBe('Replay');
  h.click('cas-step');
  expect(h.get('cas-count').textContent).toBe('Step 6 / 6');
  expect(h.jumps.filter(node => node.attributes.get('aria-current') === 'step')).toEqual([h.jumps[6]]);
  expect(h.get('cas-status').textContent).toContain('Both threads enter');
});

test('manual navigation pauses playback and reset can stop playback at the initial step', () => {
  for (const action of ['cas-prev', 'cas-step', 'jump']) {
    const h = harness();
    h.click('cas-play');
    h.tick();
    h.tick();
    if (action === 'jump') h.jumps[4].dispatch('click');
    else h.click(action);
    expect(h.timers.size).toBe(0);
    expect(h.get('cas-play-label').textContent).toBe('Play');
    const count = h.get('cas-count').textContent;
    h.tick();
    expect(h.get('cas-count').textContent).toBe(count);
  }
  const h = harness();
  h.click('cas-play');
  expect(h.get('cas-reset').attributes.get('aria-disabled')).toBe('false');
  h.click('cas-reset');
  expect(h.timers.size).toBe(0);
  expect(h.get('cas-reset').attributes.get('aria-disabled')).toBe('true');
});

test('playback finishes once, replays from zero, and pauses on lifecycle changes', () => {
  const h = harness();
  h.click('cas-play');
  for (let index = 0; index < 6; index++) h.tick();
  expect(h.timers.size).toBe(0);
  expect(h.get('cas-play-label').textContent).toBe('Replay');
  h.click('cas-play');
  expect(h.get('cas-count').textContent).toBe('Step 0 / 6');
  expect(h.get('cas-play').attributes.get('aria-label')).toBe('Pause simulation');
  const pauseEvents = [() => h.offscreen(), () => { h.document.hidden = true; h.document.dispatch('visibilitychange'); }, () => h.lifecycle.dispatch('pagehide'), () => h.lifecycle.dispatch('samey-pageleave')];
  for (const pause of pauseEvents) {
    if (!h.timers.size) h.click('cas-play');
    pause();
    expect(h.timers.size).toBe(0);
    expect(h.get('cas-play-label').textContent).toBe('Play');
  }
});

test('keyboard navigation owns plain arrows and endpoints while preserving modified and editable keys', () => {
  const h = harness();
  expect(h.key('End')).toBe(true);
  expect(h.get('cas-count').textContent).toBe('Step 6 / 6');
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey', 'defaultPrevented']) expect(h.key('Home', { [modifier]: true })).toBe(false);
  const editable = new ElementStub();
  editable.editable = true;
  expect(h.key('Home', { target: editable })).toBe(false);
  expect(h.get('cas-count').textContent).toBe('Step 6 / 6');
  expect(h.key('Home')).toBe(true);
  expect(h.key('ArrowRight')).toBe(true);
  expect(h.get('cas-count').textContent).toBe('Step 1 / 6');
  expect(h.key('ArrowLeft')).toBe(true);
  h.click('cas-play');
  expect(h.key('Escape')).toBe(true);
  expect(h.timers.size).toBe(0);
  expect(h.key('Escape')).toBe(false);
});

test('ordering comparison locates the missing acquire at the wait', () => {
  const h = harness();
  expect(h.get('release-op').innerHTML).toContain('seq_cst');
  expect(h.get('acquire-op').innerHTML).toContain('relaxed');
  expect(h.get('hb-label').textContent).toBe('Unsynchronized');
  h.orders[1].dispatch('click');
  expect(h.get('release-op').innerHTML).toContain('release store');
  expect(h.get('acquire-op').innerHTML).toContain('acquire load');
  expect(h.get('ordering-caption').textContent).toContain('When the acquire wait observes');
  expect(h.orders.map(node => node.attributes.get('aria-pressed'))).toEqual(['false', 'true']);
  h.orders[0].dispatch('click');
  expect(h.get('hb-label').textContent).toBe('Unsynchronized');
});
