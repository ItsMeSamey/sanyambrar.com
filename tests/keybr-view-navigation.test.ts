import { expect, test } from 'bun:test';
import { createMemo, createSignal } from 'solid-js';

// Exercise the component's real navigation/lifecycle body without rendering JSX.
// Animation completion is controlled so history events can interrupt the erase.
const source = await Bun.file(new URL('../src/games/keybr/widget/components/view/ViewSwitch.tsx', import.meta.url)).text();
const body = source.slice(source.indexOf('  const first ='), source.indexOf('  return <ViewContext'));
const code = new Bun.Transpiler({loader: 'ts'}).transformSync(
  `function mount(props: any) {${body.replace('import.meta.env.MODE', '"test"')}\nreturn {setView,currentView,setBeforeLeave};}`,
);
const mount = new Function('createSignal', 'createMemo', 'readHistoryState', 'onSettled', 'onCleanup', 'location', 'history', 'document', 'globalThis', 'addEventListener', 'removeEventListener',
  `${code}; return mount;`);
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

function fixture() {
  const location = {href: 'https://example.test/keybr.html?seed=second'};
  const history = {
    state: {} as Record<string, unknown>, length: 1,
    pushState(state: Record<string, unknown>, _title: string, url: URL | string) {
      this.state = state; this.length++; location.href = String(url);
    },
    replaceState(state: Record<string, unknown>, _title: string, url: URL | string) {
      this.state = state; location.href = String(url);
    },
  };
  const pending: (() => void)[] = [];
  const listeners = new Map<string, () => void>();
  const cleanups: (() => void)[] = [];
  const component = mount(createSignal, createMemo, () => history.state, (fn: () => void) => fn(), (fn: () => void) => cleanups.push(fn),
    location, history, {getElementById: () => ({})},
    {SameyAnimateLocalSwap: (_root: unknown, commit: () => void) => { pending.push(commit); return Promise.resolve(); }},
    (name: string, callback: () => void) => listeners.set(name, callback),
    (name: string) => listeners.delete(name))({views: {practice() {}, settings() {}, statistics() {}}}) as {
      setView(name: string): void; currentView(): string; setBeforeLeave(handler: () => void): () => void;
    };
  return {component, location, history, pending, cleanups, listeners};
}

test('Back to the displayed Keybr view invalidates an earlier animated navigation', async () => {
  const {component, location, history, pending, listeners} = fixture();
  let left = 0;
  component.setBeforeLeave(() => left++);
  component.setView('settings');
  history.replaceState({keybrViewIndex: 0}, '', 'https://example.test/keybr.html?seed=first');
  listeners.get('popstate')!();
  pending[0]!();
  await settle();
  expect(component.currentView()).toBe('practice');
  expect(location.href).toBe('https://example.test/keybr.html?seed=first');
  expect(history.length).toBe(1);
  expect(left).toBe(0);
});

test('the latest Keybr view request wins and ordinary navigation keeps its leave callback', async () => {
  const {component, location, history, pending, listeners} = fixture();
  let left = 0;
  component.setBeforeLeave(() => left++);
  component.setView('settings');
  component.setView('statistics');
  pending[1]!();
  await settle();
  pending[0]!();
  await settle();
  expect(component.currentView()).toBe('statistics');
  expect(new URL(location.href).searchParams.get('p')).toBe('statistics');
  expect(history.length).toBe(2);
  expect(left).toBe(1);
  history.replaceState({keybrViewIndex: 0}, '', 'https://example.test/keybr.html?seed=second');
  listeners.get('popstate')!();
  pending[2]!();
  await settle();
  expect(component.currentView()).toBe('practice');
  expect(history.length).toBe(2);
  component.setView('settings');
  pending[3]!();
  await settle();
  expect(component.currentView()).toBe('settings');
  expect(history.state.keybrViewIndex).toBe(1);
});

test('disposing Keybr prevents pending navigation from changing history or firing leave', async () => {
  const {component, history, pending, cleanups, listeners} = fixture();
  let left = 0;
  component.setBeforeLeave(() => left++);
  component.setView('settings');
  for (const cleanup of cleanups) cleanup();
  pending[0]!();
  await settle();
  expect(component.currentView()).toBe('practice');
  expect(history.length).toBe(1);
  expect(left).toBe(0);
  expect(listeners.has('popstate')).toBe(false);
});
