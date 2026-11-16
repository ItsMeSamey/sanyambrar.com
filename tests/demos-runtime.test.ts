import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { reverbExportLimitSeconds } from '../src/site/demos/reverb-export.ts';

// Exercise the actual imperative handlers with deterministic DOM/clock substitutes.
// This does not stand in for browser layout, paint, or native pointer capture tests.
const runtime = ts.createSourceFile('reverb-runtime.ts', readFileSync(new URL('../src/site/demos/reverb-runtime.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
function declaration(name: string): string {
  let result = '';
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) result = node.getText(runtime);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) result = `const ${node.getText(runtime)};`;
    ts.forEachChild(node, visit);
  }
  visit(runtime);
  if (!result) throw new Error(`Missing runtime declaration: ${name}`);
  return result;
}
function handlers(names: string[], scope: Record<string, unknown>) {
  const code = ts.transpileModule(names.map(declaration).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return runInNewContext(`${code}\n({${names.join(',')}})`, scope) as Record<string, (...args: any[]) => any>;
}
class ElementStub {
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  listeners = new Map<string, (event: any) => void>();
  children = new Map<string, ElementStub>();
  textContent = '';
  tabIndex = -1;
  id = '';
  firstChild = null;
  nextSibling = null;
  isConnected = true;
  style: Record<string, any> = { setProperty() {}, removeProperty() {} };
  classList = { toggle() {}, add() {}, remove() {}, contains: () => false };
  querySelector(selector: string) {
    let child = this.children.get(selector);
    if (!child) this.children.set(selector, child = new ElementStub());
    return child;
  }
  cloneNode() { return new ElementStub(); }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  removeAttribute(name: string) { this.attributes.delete(name); }
  addEventListener(name: string, listener: (event: any) => void) { this.listeners.set(name, listener); }
  prepend() {}
  append() {}
  appendChild() {}
  insertBefore() {}
}

function recordingHarness() {
  const states: any[] = [];
  const scope: Record<string, any> = {
    HTMLElement: ElementStub,
    document: { createElement: () => new ElementStub(), createElementNS: () => new ElementStub(), querySelector: () => new ElementStub() },
    recordingTemplate: new ElementStub(), nextRecordingIndex: 0,
    settingsInitial: { extras: { compression: false }, dropdowns: ['Mono', '16-bit integer', '44.1 kHz'] },
    recordingPlayerStates: states,
    syncLibraryDateHeaders() {}, formatSavedRecordingDuration: (seconds: number) => `${Math.floor(seconds / 3600)}h`,
    formatMiB: () => '1 MiB', formatSavedRecordingTime: () => '12:00',
    formatRangeTime: (seconds: number) => `${seconds.toFixed(1)} seconds`,
    formatPlaybackTime: (seconds: number) => String(Math.floor(seconds)),
    clamp01: (value: number) => Math.max(0, Math.min(1, value)),
    syncRecordingTrimTargetVisual() {}, renderRecordingTrimVisual() {}, runRecordingPlayback() {},
  };
  const loaded = handlers(['parseRecordingDuration', 'installRecordingCard', 'addSavedRecording', 'adjustRecordingTrimTarget', 'syncRecordingPlayback'], scope);
  Object.assign(scope, loaded);
  return { ...loaded, states, scope };
}

test('one-shot capture carries delayed tick overflow into the loop', () => {
  const scope = { live: true, activeBuffer: 'one', oneSeconds: 9, oneLimitSeconds: 10, loopSeconds: 0, loopLimitSeconds: 30 };
  const { appendCapture } = handlers(['appendCapture'], scope);
  appendCapture(5);
  expect(scope).toMatchObject({ oneSeconds: 10, loopSeconds: 4, activeBuffer: 'loop', live: true });
  appendCapture(100);
  expect(scope.loopSeconds).toBe(30);
  scope.activeBuffer = 'one'; scope.oneSeconds = 9; scope.loopLimitSeconds = 0;
  appendCapture(5);
  expect(scope).toMatchObject({ oneSeconds: 10, activeBuffer: null, live: false });
});

test('saved recording and trim copy keep exact durations independent of display rounding', () => {
  const h = recordingHarness();
  h.addSavedRecording(3659.1);
  h.addSavedRecording(0.1, 'short_trim');
  expect(h.states.map(state => state.durationSeconds)).toEqual([3659.1, 0.1]);
  expect(h.states[0].waveContainer.attributes.get('aria-valuemax')).toBe('3659.1');
});

test('Library seek and both trim boundaries support keyboard adjustment and announced values', () => {
  const h = recordingHarness();
  h.addSavedRecording(120);
  const state = h.states[0];
  const key = (control: ElementStub, value: string, shiftKey = false) => {
    let prevented = false;
    control.listeners.get('keydown')!({ key: value, shiftKey, target: control, preventDefault() { prevented = true; }, stopPropagation() {} });
    expect(prevented).toBe(true);
  };
  key(state.waveContainer, 'ArrowRight');
  expect(state.positionSeconds).toBe(1);
  key(state.waveContainer, 'End');
  expect(state.positionSeconds).toBe(120);
  key(state.waveContainer, 'ArrowLeft', true);
  expect(state.positionSeconds).toBeCloseTo(119.9);
  state.trimMode = true; state.trimEndSeconds = 120;
  h.syncRecordingPlayback(state);
  expect(state.waveContainer.tabIndex).toBe(-1);
  expect(state.waveContainer.attributes.has('aria-valuenow')).toBe(false);
  expect(state.trimStartBoundary.tabIndex).toBe(0);
  expect(state.trimEndBoundary.tabIndex).toBe(0);
  key(state.trimStartBoundary, 'ArrowRight', true);
  expect(state.trimStartSeconds).toBeCloseTo(0.1);
  key(state.trimEndBoundary, 'PageDown');
  expect(state.trimEndSeconds).toBe(110);
  expect(state.trimEndBoundary.attributes.get('aria-valuenow')).toBe('110');
  key(state.trimEndBoundary, 'Home');
  expect(state.trimEndSeconds - state.trimStartSeconds).toBeCloseTo(0.05);
});

test('leaving the Library stops playback and transient scrub ownership', () => {
  const calls: string[] = [];
  const state = {};
  const scope = {
    recordingPlayerStates: [state], document: { activeElement: null }, HTMLElement: ElementStub, screens: [],
    finishRecordingFineAdjust: () => calls.push('fine'), finishRecordingWaveScrub: () => calls.push('wave'),
    setRecordingPlaying: (target: object, playing: boolean) => { expect(target).toBe(state); expect(playing).toBe(false); calls.push('pause'); },
  };
  const { activateScreen } = handlers(['activateScreen'], scope);
  activateScreen('homeScreen');
  expect(calls).toEqual(['fine', 'wave', 'pause']);
  calls.length = 0;
  activateScreen('libraryScreen');
  expect(calls).toEqual([]);
});

test('buffer swipe abort releases its pointer and rejects commit', () => {
  const calls: unknown[] = [];
  const scope = {
    bufferSwipePointerId: 7, bufferDragging: true, bufferTransitionProgress: 0.8,
    BUFFER_SWIPE_COMMIT_PROGRESS: 0.4, suppressBlobClick: true,
    blobArea: { hasPointerCapture: (id: number) => id === 7, releasePointerCapture: (id: number) => calls.push(id) },
    settleBufferTransition: (...args: unknown[]) => calls.push(args),
    setTimeout: (callback: () => void) => callback(),
  };
  const { finishBufferSwipe } = handlers(['finishBufferSwipe'], scope);
  finishBufferSwipe(true);
  expect(calls).toEqual([7, [0, false]]);
  expect(scope.bufferSwipePointerId).toBe(-1);
  expect(scope.bufferDragging).toBe(false);
  expect(scope.suppressBlobClick).toBe(false);
});

test('export duration follows the selected container frame budget', () => {
  const scope = {
    reverbExportLimitSeconds,
    settingsInitial: { dropdowns: ['Mono', '16-bit integer', '44.1 kHz'], extras: { compression: false } },
  };
  const { rangeExportLimitSeconds } = handlers(['rangeExportLimitSeconds'], scope);
  expect(rangeExportLimitSeconds()).toBeCloseTo(48695.773900226755);
  scope.settingsInitial.extras.compression = true;
  expect(rangeExportLimitSeconds()).toBe(68719476735 / 44100);
  expect(rangeExportLimitSeconds()).toBeGreaterThan(48 * 3600);
  for (const format of ['8-bit integer', '16-bit integer', '32-bit float']) {
    const sampleBytes = format === '8-bit integer' ? 1 : format === '16-bit integer' ? 2 : 4;
    const header = format === '32-bit float' ? 58 : 44;
    const limit = reverbExportLimitSeconds(['Stereo', format, '192 kHz'], false);
    const payload = Math.round(limit * 192000) * 2 * sampleBytes;
    expect(payload + header).toBeLessThanOrEqual(0xffffffff + 8);
    expect(payload + header + 2 * sampleBytes).toBeGreaterThan(0xffffffff + 8);
    expect(reverbExportLimitSeconds(['Stereo', format, '192 kHz'], true)).toBe(68719476735 / 192000);
  }
});

test('switching to FLAC rejects non-16-bit capture and focuses the editable format', () => {
  let format = '32-bit float';
  let focused = false;
  const messages: string[] = [];
  const scope = {
    settingsInitial: { extras: { compression: false } },
    extraSettings: { snapshot: () => ({ compression: true }) },
    dropdownValues: () => [{}, { textContent: format, closest: () => ({ focus() { focused = true; } }) }],
    showToast: (message: string) => messages.push(message),
  };
  const { validateCompressionDraft } = handlers(['validateCompressionDraft'], scope);
  expect(validateCompressionDraft()).toBe(false);
  expect(focused).toBe(true);
  expect(messages[0]).toContain('16-bit capture');
  format = '8-bit integer';
  expect(validateCompressionDraft()).toBe(false);
  format = '16-bit integer';
  expect(validateCompressionDraft()).toBe(true);
  // Preserve the native transition-specific rule for an already-FLAC configuration.
  scope.settingsInitial.extras.compression = true;
  format = '32-bit float';
  expect(validateCompressionDraft()).toBe(true);
});

test('blank retention size is invalid while explicit zero still means off', () => {
  const { parseRetentionSize } = handlers(['parseRetentionSize'], {});
  expect(parseRetentionSize('')).toBeNull();
  expect(parseRetentionSize('   ')).toBeNull();
  expect(parseRetentionSize('0')).toBe(0);
  expect(parseRetentionSize(' 0 ')).toBe(0);
  expect(parseRetentionSize('1,5')).toBe(1.5);
});
