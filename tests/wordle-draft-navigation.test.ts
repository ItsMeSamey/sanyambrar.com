import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRoot, createStore, flush, onSettled, snapshot, untrack } from 'solid-js';
import ts from 'typescript';
import { getDailyChallenge, legacyGameStorageKey } from '../src/games/wordle/challenge.ts';

// Execute the actual model with Solid's staged store. Rendering is deliberately
// excluded; it is covered by the compiled DOM interaction checks.
const pageSource = readFileSync(new URL('../src/games/wordle/page.tsx', import.meta.url), 'utf8');
const pageProgram = ts.createSourceFile('page.tsx', pageSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = pageProgram.statements.filter(node =>
  (ts.isClassDeclaration(node) && ['Keyboard', 'GameState', 'WordleModel'].includes(node.name?.text ?? '')) ||
  (ts.isFunctionDeclaration(node) && node.name?.text === 'storageCell')
).map(node => node.getText(pageProgram)).join('\n');
const modelCode = ts.transpileModule(`${pageSource.slice(pageSource.indexOf('const ABCD'), pageSource.indexOf('function recordDone'))}\n${declarations}\n({WordleModel, storageCell})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText;

function modelHarness(mode: 'daily' | 'random' | 'advanced', unreadable = false) {
  const config = { mode, wordLength: 5, maxTries: 6, disabledLetters: 0, allowAny: true, dailyDate: '2026-11-17', dailyVersion: 1, wordIndex: 767 };
  const initial = { word: 'apple', wordIndex: 767, history: [['crate', 'rrryr'], ['', '']], disabled: '', config };
  let raw = unreadable ? '{unreadable saved game' : JSON.stringify(initial);
  let writes = 0;
  const { WordleModel, storageCell } = runInNewContext(modelCode, {
    createStore, onSettled, snapshot, untrack, structuredClone, getDailyChallenge, legacyGameStorageKey,
    Element: class {}, requestAnimationFrame: () => 1,
    localStorage: { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; writes++; } },
    window: { dispatchEvent() {} }, CustomEvent: class {}, console: { warn() {} },
  });
  const mount = () => {
    let model: any;
    const dispose = createRoot(dispose => {
      model = new WordleModel({ reveal: false, fastInvalidate: true }, config,
        storageCell('draft', structuredClone(initial), JSON.parse, JSON.stringify), () => {}, () => {});
      return dispose;
    });
    flush();
    return { model, dispose };
  };
  const key = (model: any, key: string, extra = {}) => {
    const event = { key, target: null, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extra };
    model.handleKeyDown(event);
    flush();
    return event;
  };
  return { mount, key, get raw() { return raw; }, get writes() { return writes; } };
}

for (const mode of ['daily', 'random', 'advanced'] as const) test(`Wordle ${mode} drafts survive remount and persist deletion`, () => {
  const h = modelHarness(mode);
  let session = h.mount();
  try {
    h.key(session.model, 'a'); h.key(session.model, 'p');
    expect(JSON.parse(h.raw).history.at(-1)).toEqual(['ap', '']);
    session.dispose(); session = h.mount();
    expect(session.model.state.currentEntry).toEqual(['ap', '']);
    h.key(session.model, 'Backspace');
    expect(JSON.parse(h.raw).history.at(-1)).toEqual(['a', '']);
    h.key(session.model, 'Escape');
    expect(JSON.parse(h.raw).history.at(-1)).toEqual(['', '']);
    const writes = h.writes;
    const event = h.key(session.model, 'r', { isComposing: true });
    expect(event.defaultPrevented).toBe(false);
    expect(session.model.state.currentEntry).toEqual(['', '']);
    expect(h.writes).toBe(writes);
  } finally { session.dispose(); }
});

test('Wordle draft edits preserve an unreadable saved record verbatim', () => {
  const h = modelHarness('random', true);
  const before = h.raw;
  const session = h.mount();
  try {
    for (const key of ['a', 'p', 'Backspace', 'Escape']) h.key(session.model, key);
    expect(h.raw).toBe(before);
    expect(h.writes).toBe(0);
  } finally { session.dispose(); }
});

const navigationSource = readFileSync(new URL('../src/games/wordle/navigation.ts', import.meta.url), 'utf8').replace(/^import .*$/gm, '').replace(/^export /gm, '');
const navigationCode = ts.transpileModule(`${navigationSource}\n({Page, setP, selectP, mountPageNavigation, setPageRoot})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
function navigationHarness() {
  const listeners = new Map<string, () => void>();
  const commits: (() => void)[] = [];
  const location = { href: 'https://example.test/wordle.html?seed=original' };
  let pushes = 0;
  const nav = runInNewContext(navigationCode, {
    URL, location,
    createSignal: (initial: number) => { let value = initial; return [() => value, (next: number) => { value = next; }]; },
    readHistoryState: () => ({ retained: true }),
    history: { pushState(_state: unknown, _title: string, url: URL) { location.href = url.href; pushes++; } },
    animateRootSwap: (_root: unknown, commit: () => void) => { commits.push(commit); return Promise.resolve(); },
    addEventListener: (event: string, listener: () => void) => listeners.set(event, listener),
    removeEventListener: (event: string) => listeners.delete(event),
  });
  const dispose = nav.mountPageNavigation();
  return { nav, location, dispose, listeners, finish: () => commits.splice(0).forEach(commit => commit()), get pushes() { return pushes; } };
}

test('Wordle same-page popstate supersedes a pending Stats transition', () => {
  const h = navigationHarness();
  h.nav.setP(h.nav.Page.Stats);
  h.location.href = 'https://example.test/wordle.html?seed=previous';
  h.listeners.get('popstate')!();
  h.finish();
  expect(h.location.href).toBe('https://example.test/wordle.html?seed=previous');
  expect(h.pushes).toBe(0);
  expect(h.nav.selectP(h.nav.Page.Wordle)).toBe(true);
  h.dispose();
});

test('Wordle new intent and unmount invalidate pending navigation without disturbing normal history', () => {
  const h = navigationHarness();
  h.nav.setP(h.nav.Page.Stats); h.nav.setP(h.nav.Page.Wordle); h.finish();
  expect(h.pushes).toBe(0);
  h.nav.setP(h.nav.Page.Stats); h.finish();
  expect(h.location.href).toBe('https://example.test/wordle.html?seed=original&p=1');
  h.nav.setP(h.nav.Page.Wordle); h.finish();
  expect(h.location.href).toBe('https://example.test/wordle.html?seed=original');
  expect(h.pushes).toBe(2);
  h.nav.setP(h.nav.Page.Stats); h.dispose(); h.finish();
  expect(h.pushes).toBe(2);
  expect(h.nav.selectP(h.nav.Page.Wordle)).toBe(true);
});
