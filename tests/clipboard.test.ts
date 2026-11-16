import { afterEach, expect, test } from 'bun:test';
import { writeClipboardText } from '../src/shared/clipboard.ts';
import { captureSelection } from '../src/shared/selection.ts';

const originals = new Map<string, PropertyDescriptor | undefined>();
function install(name: string, value: unknown) {
  if (!originals.has(name)) originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}
afterEach(() => {
  for (const [name, original] of originals) {
    if (original) Object.defineProperty(globalThis, name, original);
    else Reflect.deleteProperty(globalThis, name);
  }
  originals.clear();
});

function harness(legacy: boolean | Error | undefined, native: boolean | undefined = true) {
  const events: string[] = [];
  let copied = '';
  let nativeCalls = 0;
  const anchor = { isConnected: true };
  const range = {
    commonAncestorContainer: anchor,
    cloneRange() { return { ...this }; },
  };
  const selection = {
    rangeCount: 1, anchorNode: anchor as object | null, focusNode: anchor as object | null,
    anchorOffset: 12, focusOffset: 3,
    getRangeAt() { return range; }, toString() { return this.rangeCount ? 'backwards' : ''; },
    removeAllRanges() {
      this.rangeCount = 0; this.anchorNode = this.focusNode = null;
      if (doc.activeElement instanceof Field) doc.activeElement.setSelectionRange(0, 0);
    },
    addRange() { this.rangeCount++; this.anchorNode = this.focusNode = anchor; },
    setBaseAndExtent(a: object, start: number, f: object, end: number) {
      this.anchorNode = a; this.anchorOffset = start; this.focusNode = f; this.focusOffset = end;
    },
  };
  class Element {
    isConnected = true;
    focus() { doc.activeElement = this; events.push('focus'); }
    closest() { return owner; }
  }
  class Field extends Element {
    value = ''; selectionStart = 0; selectionEnd = 0; selectionDirection = 'none';
    tabIndex = 0; style = { cssText: '' }; attributes = new Map<string, string>();
    setAttribute(key: string, value: string) { this.attributes.set(key, value); }
    setSelectionRange(start: number, end: number, direction = 'none') {
      this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction;
    }
    select() { selection.removeAllRanges(); this.selectionStart = 0; this.selectionEnd = this.value.length; }
    remove() { this.isConnected = false; events.push('remove'); }
  }
  const initial = new Field();
  initial.value = 'before SELECT after';
  initial.setSelectionRange(7, 13, 'backward');
  const owner = { append(field: Field) { events.push('append-owner'); expect(field.attributes.get('readonly')).toBe(''); } };
  const doc = {
    activeElement: initial as Element,
    body: { append() { throw Error('Clipboard field escaped its modal'); } },
    getSelection: () => selection,
    createElement: () => new Field(),
    execCommand: legacy === undefined ? undefined : (command: string) => {
      events.push('legacy'); expect(command).toBe('copy');
      const field = doc.activeElement as Field;
      expect(field.selectionStart).toBe(0);
      expect(field.selectionEnd).toBe(field.value.length);
      if (legacy instanceof Error) throw legacy;
      if (legacy) copied = field.value;
      return legacy;
    },
  };
  install('HTMLElement', Element); install('HTMLInputElement', Field); install('HTMLTextAreaElement', Field);
  install('document', doc);
  install('navigator', { clipboard: native === undefined ? undefined : { writeText: async (text: string) => {
    nativeCalls++; events.push('native'); if (!native) throw Error('Denied'); copied = text;
  } } });
  return { events, doc, initial, pageFocus: new Element(), selection, copied: () => copied, nativeCalls: () => nativeCalls };
}

test('legacy copy happens synchronously in the gesture and preserves backwards input selection despite document-selection coupling', async () => {
  const h = harness(true);
  const pending = writeClipboardText('  clipboard marker\n');
  expect(h.copied()).toBe('  clipboard marker\n');
  expect(h.nativeCalls()).toBe(0);
  expect(h.doc.activeElement).toBe(h.initial);
  expect([h.initial.selectionStart, h.initial.selectionEnd, h.initial.selectionDirection]).toEqual([7, 13, 'backward']);
  expect(await pending).toBe(true);
});

test('legacy page copy restores the backwards document range and original focus', async () => {
  const h = harness(true);
  h.doc.activeElement = h.pageFocus;
  expect(await writeClipboardText('page marker')).toBe(true);
  expect(h.doc.activeElement).toBe(h.pageFocus);
  expect([h.selection.rangeCount, h.selection.anchorOffset, h.selection.focusOffset]).toEqual([1, 12, 3]);
});

test('legacy rejection restores selection before immediately requesting native clipboard', async () => {
  for (const failure of [false, Error('Unsupported')]) {
    const h = harness(failure);
    expect(await writeClipboardText('native marker')).toBe(true);
    expect(h.events.indexOf('legacy')).toBeLessThan(h.events.indexOf('native'));
    expect(h.events.indexOf('remove')).toBeLessThan(h.events.indexOf('native'));
    expect(h.doc.activeElement).toBe(h.initial);
    expect(h.copied()).toBe('native marker');
  }
});

test('missing legacy copy uses native API without creating a temporary selection', async () => {
  const h = harness(undefined);
  expect(await writeClipboardText('native only')).toBe(true);
  expect(h.events).toEqual(['native']);
});

test('denied native and rejected legacy copy return false without claiming success', async () => {
  const h = harness(false, false);
  expect(await writeClipboardText('denied')).toBe(false);
  expect(h.copied()).toBe('');
  expect(h.doc.activeElement).toBe(h.initial);
  expect(h.initial.selectionStart).toBe(7);
});

test('unavailable clipboard methods report failure', async () => {
  const h = harness(undefined);
  install('navigator', {});
  expect(await writeClipboardText('unavailable')).toBe(false);
  expect(h.events).toEqual([]);
});

test('selection snapshots reject changed text, changed ranges and disconnected editors', () => {
  const h = harness(true);
  const snapshot = captureSelection();
  expect(snapshot.text).toBe('SELECT');
  expect(snapshot.matches()).toBe(true);
  h.initial.value = 'changed';
  expect(snapshot.matches()).toBe(false);
  h.initial.value = 'before SELECT after';
  h.initial.selectionStart = 8;
  expect(snapshot.matches()).toBe(false);
  snapshot.restore();
  expect(snapshot.matches()).toBe(true);
  h.initial.isConnected = false;
  expect(snapshot.matches()).toBe(false);
});
