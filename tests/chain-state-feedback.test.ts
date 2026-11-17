import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { compactMatchHistory, canResumeReplay } from '../src/games/chain/match-history.ts';

// Exercise the actual mounted engine's handlers and storage boundary. This
// fixture supplies DOM/event primitives; it makes no canvas pixel claims.
const source = readFileSync(new URL('../src/games/chain/chain.ts', import.meta.url), 'utf8').replace(/^import .*$/gm, '').replace(/^export /gm, '');
const code = ts.transpileModule(`${source}\nmountChain`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const GAME = 'samey.chain.game.v4';
function fixture(reducedMotion = true) {
  const windowEvents = new EventTarget();
  const frames = new Map<number, FrameRequestCallback>();
  let frameId = 0;
  let animations = 0;
  let blocked = false;
  let writes = 0;
  const values = new Map<string, string>();
  const location = new URL('https://example.test/chain/?p=game');
  const context = new Proxy({}, { get: (_target, name) => name === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {} });
  class ElementStub extends EventTarget {
    hidden = false;
    textContent = '';
    value = '';
    className = '';
    dataset: Record<string, string> = {};
    style = { setProperty() {}, removeProperty() {} };
    classList = { add() {}, remove() {}, toggle() {} };
    children: ElementStub[] = [];
    attributes = new Map<string, string>();
    clientWidth = 600;
    clientHeight = 600;
    getContext() { return context; }
    setAttribute(name: string, value: string) { this.attributes.set(name, value); }
    getAttribute(name: string) { return this.attributes.get(name) ?? null; }
    removeAttribute(name: string) { this.attributes.delete(name); if (name.startsWith('data-')) delete this.dataset[name.slice(5)]; }
    append(...children: ElementStub[]) { this.children.push(...children); }
    replaceChildren(...children: ElementStub[]) { this.children = children; }
    remove() {}
    contains(element: ElementStub) { return element === this || this.children.includes(element); }
    closest() { return null; }
    focus() { document.activeElement = this; this.dispatchEvent(new Event('focus')); }
    getBoundingClientRect() { return { x: 0, y: 0, left: 0, top: 0, right: 600, bottom: 600, width: 600, height: 600 }; }
    animate() { animations++; return { finished: Promise.resolve(), cancel() {} }; }
    click() { this.dispatchEvent(new Event('click')); }
  }
  const document = Object.assign(new EventTarget(), { hidden: false, activeElement: null as ElementStub | null,
    documentElement: new ElementStub(), body: new ElementStub(), createElement: () => new ElementStub() });
  const refs = Object.fromEntries([
    'canvas', 'replayCanvas', 'rowsInput', 'colsInput', 'enemiesInput', 'rowsValue', 'colsValue', 'enemiesValue',
    'settingsButton', 'newGameButton', 'menuButton', 'resumeButton', 'quickButton', 'playAgainButton', 'resultMenuButton',
    'statsBackButton', 'replayClose', 'replayPrev', 'replayPlay', 'replayNext', 'replayResume', 'stage', 'statusEl',
    'botStatus', 'botStatusLabel', 'botErrorDetail', 'botRetryButton', 'turnEl', 'youSwatch', 'activeSwatch', 'settingsPanel',
    'openingView', 'gameView', 'resumeCard', 'resumeEyebrow', 'resumeTitle', 'resumeCopy', 'resumeSpec', 'resultPanel',
    'resultTitle', 'resultCopy', 'statsView', 'statGames', 'statWins', 'statRate', 'statLargest', 'statRecent',
    'replayPanel', 'replayTitle', 'replayCopy', 'replayStatus',
  ].map(name => [name, new ElementStub()])) as Record<string, any>;
  refs.statsButtons = [new ElementStub()]; refs.presets = []; refs.storageNotices = [new ElementStub()];
  refs.gameView.append(refs.stage, refs.resultPanel);
  refs.resultPanel.hidden = true;
  const b = new Uint8Array(16), o = new Uint8Array(16);
  b[0] = b[1] = 1; o[0] = 1; o[1] = 2;
  const encode = (value: ArrayLike<number>) => Buffer.from(value).toString('base64');
  values.set(GAME, JSON.stringify({ v: 4, id: 'fixture', r: 4, c: 4, e: 1, b: encode(b), o: encode(o), p: encode([0, 1, 1]), t: 1, g: false, i: true, m: [], q: false }));
  const matchMedia = () => ({ matches: reducedMotion, addEventListener() {}, removeEventListener() {} });
  const mount = runInNewContext(code, {
    document, location, URL, Event, CustomEvent, DOMException, Uint8Array, HTMLElement: ElementStub, Element: ElementStub, Node: ElementStub,
    window: Object.assign(windowEvents, { matchMedia, devicePixelRatio: 1, setTimeout }),
    addEventListener: windowEvents.addEventListener.bind(windowEvents), removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
    localStorage: { getItem: (key: string) => values.get(key) ?? null,
      setItem(key: string, value: string) { if (blocked) throw new DOMException('Quota exceeded', 'QuotaExceededError'); writes++; values.set(key, value); },
      removeItem: (key: string) => values.delete(key) },
    history: { replaceState: (_state: unknown, _title: string, url: string) => { location.href = String(url); },
      pushState: (_state: unknown, _title: string, url: string) => { location.href = String(url); } },
    readHistoryState: () => ({}), matchMedia, getComputedStyle: () => ({ getPropertyValue: () => '', color: '#333333' }),
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; }, cancelAnimationFrame: (id: number) => frames.delete(id),
    ResizeObserver: class { observe() {} disconnect() {} }, MutationObserver: class { observe() {} disconnect() {} },
    watchDevicePixelRatio: () => () => {}, compactMatchHistory, canResumeReplay,
    animateMountedViewSwap: (from: ElementStub, to: ElementStub, commit: () => void) => { commit(); from.hidden = true; to.hidden = false; return Promise.resolve(); },
    ChainBotClient: class { async prepare() { throw Error('Model unavailable'); } dispose() {} }, formatThrownError: String,
    btoa, atob, innerWidth: 1000, innerHeight: 800, performance, queueMicrotask, setTimeout, clearTimeout, console: { warn() {} },
  });
  const dispose = mount(refs);
  const key = (key: string) => { const event = new Event('keydown', { cancelable: true }); Object.assign(event, { key }); refs.canvas.dispatchEvent(event); };
  const route = (path: string, route = 'chain') => { location.href = new URL(path, location).href; windowEvents.dispatchEvent(new CustomEvent('samey-solid-routechange', { detail: { route, url: location.href } })); };
  return { refs, values, dispose, key, route, location, windowEvents,
    block: (value: boolean) => { blocked = value; }, get animations() { return animations; }, get writes() { return writes; },
    flushFrames() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(0)); },
  };
}

for (const reducedMotion of [true, false]) test(`Chain invalid moves use a static cue (reduced motion ${reducedMotion})`, () => {
  const h = fixture(reducedMotion);
  try {
    const before = h.values.get(GAME);
    h.key('ArrowRight'); h.key('Enter');
    expect(h.refs.canvas.dataset.invalid).toBe('true');
    expect(h.refs.statusEl.textContent).toContain('Choose an empty cell');
    expect(h.animations).toBe(0);
    expect(h.values.get(GAME)).toBe(before);
    h.key('ArrowLeft');
    expect(h.refs.canvas.dataset.invalid).toBeUndefined();
  } finally { h.dispose(); }
});

test('Chain quota failure preserves old bytes and continues the live board until saving recovers', async () => {
  const h = fixture();
  try {
    const before = h.values.get(GAME);
    h.block(true); h.refs.quickButton.click();
    expect(h.values.get(GAME)).toBe(before);
    expect(h.refs.resumeSpec.textContent).toContain('9 × 6');
    expect(h.refs.resumeCopy.textContent).toBe('');
    expect(h.refs.resumeButton.textContent).toBe('Continue game');
    expect(h.refs.storageNotices[0].hidden).toBe(false);
    expect(h.refs.storageNotices[0].textContent).toContain('reloading may restore an older board');
    h.refs.menuButton.click(); h.refs.resumeButton.click();
    expect(h.refs.rowsInput.value).toBe('9');
    expect(h.values.get(GAME)).toBe(before);
    h.flushFrames();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(h.refs.botStatusLabel.textContent).toContain('Retry to continue');
    expect(h.refs.botStatusLabel.textContent).not.toContain('saved');
    h.block(false); h.refs.menuButton.click(); h.refs.resumeButton.click();
    expect(JSON.parse(h.values.get(GAME)!).r).toBe(9);
    expect(h.refs.resumeButton.textContent).toBe('Continue game');
    // Settings still failed independently until the next config write.
    expect(h.refs.storageNotices[0].textContent).not.toContain('board could not be saved');
    h.refs.quickButton.click();
    expect(h.refs.storageNotices[0].hidden).toBe(true);
  } finally { h.dispose(); }
});

test('Chain same-route navigation follows URL without resetting the board or leaking listeners', () => {
  const h = fixture();
  try {
    h.route('/chain/');
    expect(h.refs.openingView.hidden).toBe(false);
    expect(h.refs.gameView.hidden).toBe(true);
    const writes = h.writes;
    h.route('/chain/');
    expect(h.writes).toBe(writes);
    h.route('/chain/?p=stats');
    expect(h.refs.statsView.hidden).toBe(false);
    h.route('/chain/?p=game');
    expect(h.refs.gameView.hidden).toBe(false);
    expect(JSON.parse(h.values.get(GAME)!).id).toBe('fixture');
    h.route('/work/', 'work');
    expect(h.refs.gameView.hidden).toBe(false);
    h.dispose();
    const saved = h.values.get(GAME);
    h.route('/chain/');
    expect(h.refs.gameView.hidden).toBe(false);
    expect(h.values.get(GAME)).toBe(saved);
  } finally { h.dispose(); }
});
