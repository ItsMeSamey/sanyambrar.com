import { describe, expect, test } from 'bun:test';
import { exportHistory, importHistory, initialScope, readHistory, saveResult, scoreKey, scopeUnit } from '../src/games/afterimage/history.ts';
import { referenceData } from '../src/games/afterimage/reference-data.ts';
import { referenceFor, summarizeBins } from '../src/games/afterimage/reference-model.ts';
import type { GameId } from '../src/games/afterimage/types.ts';

const scopes: [GameId, string][] = [
  ['visual', 'visual-v3-standard'], ['sequence', 'sequence-v3-growing'], ['sequence-fresh', 'sequence-v2-fresh'],
  ['reverse', 'reverse-v2-growing'], ['reverse-fresh', 'reverse-v2-fresh'], ['number', 'number-v2-hb'],
  ['verbal', 'verbal-v4-balanced'], ['chimp', 'chimp-v2-compact-mouse'], ['pairs', 'pairs-v4-mouse'],
  ['reaction', 'reaction-v7-desktop'], ['aim', 'aim-v4-compact-mouse'], ['typing', 'typing-v4-hardware-passage'],
  ['cps', 'cps-v1-mouse-10s'], ['number-order', 'order-v1-mouse'], ['stroop', 'stroop'], ['arithmetic', 'math'],
  ['rotation', 'rotation-v3-60s'], ['patterns', 'patterns-v3-60s'], ['search', 'search-v2-30s'],
];

function withStorage(run: (storage: Storage) => void) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key) { return values.get(key) ?? null; },
    key(index) { return [...values.keys()][index] ?? null; },
    removeItem(key) { values.delete(key); },
    setItem(key, value) { values.set(key, String(value)); },
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try { run(storage); }
  finally { if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else Reflect.deleteProperty(globalThis, 'localStorage'); }
}

describe('Afterimage original score compatibility', () => {
  test('all nineteen routes retain their original current scopes', () => {
    expect(new Set(scopes.map(([id]) => id)).size).toBe(19);
    for (const [id, scope] of scopes) expect(initialScope(id)).toBe(scope);
  });
  test('historical aliases remain readable without merging them into current rules', () => {
    expect(scoreKey('typing')).toBe('afterimage-history-typing-v2-60s');
    expect(scoreKey('stroop')).toBe('afterimage-history-stroop-v2-30s');
    expect(scoreKey('sequence-v2-growing')).toBe('afterimage-history-sequence');
    expect(scoreKey('reverse-v2-fresh')).toBe('afterimage-history-reverse');
    expect(scoreKey('sequence-v3-growing')).not.toBe(scoreKey('sequence-v2-growing'));
    expect(scoreKey('reverse-v2-growing')).not.toBe(scoreKey('reverse-v2-fresh'));
    expect(scoreKey('future-v87-custom')).toBe('afterimage-history-future-v87-custom');
  });
  test('legacy timed pairs and question sets retain their own units and direction', () => {
    expect(scopeUnit('pairs', 'pairs-v3-touch')).toEqual({ unit: 's', lower: true });
    expect(scopeUnit('pairs', 'pairs-v4-touch')).toEqual({ unit: 'rounds', lower: false });
    expect(scopeUnit('rotation', 'rotation-v2-12')).toEqual({ unit: 'correct', lower: false });
    expect(scopeUnit('rotation', 'rotation-v3-60s')).toEqual({ unit: 'points', lower: false });
  });
  test('saving preserves unknown rows and metadata without modifying another rules version', () => withStorage(storage => {
    const key = scoreKey('sequence-v3-growing');
    const unknown = { unexpected: 'future data', nested: { keep: true } };
    const dated = { value: 7, date: 123, custom: { labels: ['retain'] } };
    storage.setItem(key, JSON.stringify([unknown, dated]));
    storage.setItem(scoreKey('sequence-v2-growing'), '[{"value":99}]');
    saveResult({ value: 8, scope: 'sequence-v3-growing', unit: 'levels', details: { rulesVersion: 3 } });
    const saved = JSON.parse(storage.getItem(key)!);
    expect(saved.slice(0, 2)).toEqual([unknown, dated]);
    expect(saved[2]).toMatchObject({ value: 8, scoreMode: 'sequence-v3-growing', rulesVersion: 3 });
    expect(storage.getItem(scoreKey('sequence-v2-growing'))).toBe('[{"value":99}]');
    expect(readHistory('sequence-v3-growing')).toHaveLength(2);
  }));
  test('normal new scores retain the latest 200 without rewriting unrelated storage', () => withStorage(storage => {
    const key = scoreKey('math');
    storage.setItem(key, JSON.stringify(Array.from({ length: 200 }, (_, date) => ({ value: date, date }))));
    storage.setItem('unrelated-site-key', 'untouched');
    saveResult({ value: 300, scope: 'math', unit: 'points' });
    const rows = readHistory('math');
    expect(rows).toHaveLength(200);
    expect(rows[0].date).toBe(1);
    expect(rows.at(-1)?.value).toBe(300);
    expect(storage.getItem('unrelated-site-key')).toBe('untouched');
  }));
  test('export preserves opaque storage and import retains distinct equal-score records and undated runs', () => withStorage(storage => {
    const key = scoreKey('future-v9');
    const rows = [{ value: 2, date: 123, marker: 'one' }, { value: 2, date: 123, marker: 'two' }, { value: 8 }];
    storage.setItem(key, JSON.stringify(rows));
    const backup = exportHistory();
    storage.removeItem(key);
    expect(importHistory(backup)).toBe(3);
    expect(readHistory('future-v9')).toEqual(rows);
    expect(importHistory(backup)).toBe(0);
    expect(readHistory('future-v9')).toEqual(rows);
    storage.setItem(scoreKey('opaque-future'), '{unparseable raw data');
    expect(JSON.parse(exportHistory()).data[scoreKey('opaque-future')]).toBe('{unparseable raw data');
  }));
});

describe('Afterimage external reference integrity', () => {
  test('only original compatible protocols receive a distribution', () => {
    const eligible: [GameId, string][] = [
      ['visual', 'visual-v3-standard'], ['sequence', 'sequence-v3-growing'], ['number', 'number-v2-hb'],
      ['typing', 'typing-v4-hardware-passage'], ['aim', 'aim-v4-standard-mouse'],
      ['chimp', 'chimp-v2-standard-mouse'], ['reaction', 'reaction-v5-desktop'],
    ];
    for (const [id, scope] of eligible) expect(referenceFor(id, scope)?.kind).toBe('histogram');
    const excluded: [GameId, string][] = [
      ['reaction', 'reaction-v7-desktop'], ['reaction', 'reaction-v7-touch-release'], ['reaction', 'reaction-v5-touch'],
      ['verbal', 'verbal-v4-balanced'], ['verbal', 'verbal'], ['sequence-fresh', 'sequence-v2-fresh'],
      ['visual', 'visual-v3-long'], ['typing', 'typing-v4-onscreen-passage'], ['number', 'number'],
      ['aim', 'aim-v4-compact-mouse'], ['aim', 'aim-v6-standard-touch'], ['chimp', 'chimp-v2-standard-keyboard'],
      ['pairs', 'pairs-v4-mouse'], ['rotation', 'rotation-v3-60s'], ['cps', 'tps-v3-touch-10s'],
    ];
    for (const [id, scope] of excluded) expect(referenceFor(id, scope)).toBeNull();
    expect(referenceFor('aim', 'aim-v4-standard-mouse', 'compact')).toBeNull();
    expect(referenceFor('chimp', 'chimp-v2-standard-mouse', 'compact')).toBeNull();
  });
  test('click reference is a mixed-input mean rather than an invented histogram', () => {
    for (const scope of ['cps-v1-mouse-10s', 'tps-v1-touch-10s']) {
      expect(referenceFor('cps', scope)).toEqual({ kind: 'mean', mean: 6.66, source: 'https://cpstest.app/stats/' });
    }
    expect(referenceFor('cps', 'tps-v2-touch-10s')).toBeNull();
  });
  test('published observation totals and median bins survive extraction', () => {
    const expected: [keyof typeof referenceData, number, number, number][] = [
      ['reactiontime', 70940, 225, 228.7908796165774], ['memory', 29243, 11, 11.49960674349417],
      ['verbal-memory', 26860, 40, 44.1198808637379], ['number-memory', 24084, 9, 9.245930908486962],
      ['typing', 22148, 50, 51.03575943651797], ['aim', 65052, 450, 470.1431162762098],
      ['chimp', 27233, 10, 10.291117394337752], ['sequence', 35868, 9, 9.9101706256273],
    ];
    for (const [name, total, median, mean] of expected) {
      const result = summarizeBins(referenceData[name]);
      expect(result?.total).toBe(total);
      expect(result?.median).toBe(median);
      expect(result?.mean).toBeCloseTo(mean, 10);
    }
    expect(summarizeBins([])).toBeNull();
  });
});
