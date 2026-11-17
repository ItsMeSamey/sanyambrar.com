import { describe, expect, test } from 'bun:test';
import { exportHistory, importHistory, initialScope, isCurrentScope, readHistory, saveResult, scoreKey, scopeChoices, scopeUnit } from '../src/games/afterimage/history.ts';
import { referenceData } from '../src/games/afterimage/reference-data.ts';
import { referenceFor, summarizeBins } from '../src/games/afterimage/reference-model.ts';
import { isHardGame, type GameId } from '../src/games/afterimage/types.ts';

const scopes: [GameId, string][] = [
  ['visual', 'visual-v3-standard'], ['sequence', 'sequence-v3-growing'], ['sequence-fresh', 'sequence-v2-fresh'],
  ['reverse', 'reverse-v2-growing'], ['reverse-fresh', 'reverse-v2-fresh'], ['number', 'number-v2-hb'],
  ['verbal', 'verbal-v5-progressive'], ['chimp', 'chimp-v3-compact-mouse'], ['pairs', 'pairs-v4-mouse'],
  ['reaction', 'reaction-v7-desktop'], ['aim', 'aim-v4-compact-mouse'], ['typing', 'typing-v4-hardware-passage'],
  ['cps', 'cps-v1-mouse-10s'], ['number-order', 'order-v2-mouse'], ['stroop', 'stroop'], ['arithmetic', 'math'],
  ['rotation', 'rotation-v4-60s'], ['patterns', 'patterns-v4-60s'], ['search', 'search-v2-30s'],
  ['paper-folding', 'paper-folding-v2-60s'], ['deduction', 'deduction-v3-letters-60s'], ['colour-match', 'colour-match-v2-60s'],
  ['rhythm', 'rhythm-v1-mouse'], ['tracking', 'tracking-v1'], ['tracking-hard', 'tracking-hard-v1'],
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
  test('active and archived games resolve their current rules scopes', () => {
    expect(new Set(scopes.map(([id]) => id)).size).toBe(25);
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
  test('new survival games use their own units and only their exact current protocols', () => {
    for (const kind of ['mouse', 'touch', 'pen', 'keyboard']) {
      expect(isCurrentScope('rhythm', `rhythm-v1-${kind}`)).toBe(true);
      expect(scopeUnit('rhythm', `rhythm-v1-${kind}`)).toEqual({ unit: 'levels', lower: false });
      expect(referenceFor('rhythm', `rhythm-v1-${kind}`)).toBeNull();
    }
    for (const scope of ['rhythm-v1', 'rhythm-v1-controller', 'rhythm-v2-mouse', 'rhythm-v1-mouse-extra', 'tracking-v1']) expect(isCurrentScope('rhythm', scope)).toBe(false);
    for (const id of ['tracking', 'tracking-hard'] as const) {
      expect(isCurrentScope(id, initialScope(id))).toBe(true);
      expect(isCurrentScope(id, `${id}-v2`)).toBe(false);
      expect(isCurrentScope(id, initialScope(id === 'tracking' ? 'tracking-hard' : 'tracking'))).toBe(false);
      expect(scopeUnit(id, initialScope(id))).toEqual({ unit: 'rounds', lower: false });
      expect(referenceFor(id, initialScope(id))).toBeNull();
    }
    expect(['sequence-fresh', 'reverse-fresh', 'tracking-hard'].every(id => isHardGame(id as GameId))).toBe(true);
    expect(['sequence', 'reverse', 'rhythm', 'tracking'].some(id => isHardGame(id as GameId))).toBe(false);
  });
  test('rhythm input filters are relevant, named, and appear only after a saved run', () => withStorage(storage => {
    expect(scopeChoices('rhythm')).toEqual([['rhythm-v1-mouse', 'Mouse']]);
    storage.setItem(scoreKey('rhythm-v1-mouse'), '[{"value":3}]');
    storage.setItem(scoreKey('rhythm-v1-touch'), '[{"value":5}]');
    storage.setItem(scoreKey('rhythm-v1-pen'), '[]');
    storage.setItem(scoreKey('rhythm-v99-custom'), '[{"value":7}]');
    expect(scopeChoices('rhythm', 'rhythm-v1-keyboard')).toEqual([
      ['rhythm-v1-keyboard', 'Keyboard'], ['rhythm-v1-mouse', 'Mouse'], ['rhythm-v1-touch', 'Touch'],
      ['rhythm-v99-custom', 'Saved rules · rhythm-v99-custom'],
    ]);
  }));
  test('tracking difficulty histories never appear in the other difficulty filter', () => withStorage(storage => {
    for (const scope of ['tracking-v1', 'tracking-hard-v1', 'tracking-v99', 'tracking-hard-v99', 'tracking-hard']) storage.setItem(scoreKey(scope), '[{"value":5}]');
    expect(scopeChoices('tracking')).toEqual([['tracking-v1', 'Current rules'], ['tracking-v99', 'Saved rules · tracking-v99']]);
    expect(scopeChoices('tracking-hard')).toEqual([['tracking-hard-v1', 'Current rules'], ['tracking-hard-v99', 'Saved rules · tracking-hard-v99'], ['tracking-hard', 'Saved rules · tracking-hard']]);
  }));
  test('new scores and export/import preserve every previous scope and opaque metadata', () => withStorage(storage => {
    const preserved = scopes.filter(([id]) => !['rhythm', 'tracking', 'tracking-hard'].includes(id)).map(([, scope]) => [scoreKey(scope), '[ { "value": 9, "date": 123, "future": { "keep": true } } ]'] as const);
    for (const [key, raw] of preserved) storage.setItem(key, raw);
    for (const id of ['rhythm', 'tracking', 'tracking-hard'] as const) saveResult({ scope: initialScope(id), value: 7, unit: scopeUnit(id, initialScope(id)).unit, details: { rulesVersion: 1, inputKind: 'mouse', accuracy: 85 } });
    for (const [key, raw] of preserved) expect(storage.getItem(key)).toBe(raw);
    const backup = exportHistory(); storage.clear();
    expect(importHistory(backup)).toBe(25);
    for (const [key, raw] of preserved) expect(storage.getItem(key)).toBe(raw);
    for (const id of ['rhythm', 'tracking', 'tracking-hard'] as const) expect(readHistory(initialScope(id))[0]).toMatchObject({ value: 7, rulesVersion: 1, inputKind: 'mouse', accuracy: 85, unit: scopeUnit(id, initialScope(id)).unit });
    expect(importHistory(backup)).toBe(0);
  }));
  test('fresh history offers only the active protocol across all games', () => withStorage(() => {
    for (const [id, scope] of scopes) expect(scopeChoices(id).map(([value]) => value)).toEqual([scope]);
    expect(scopeChoices('aim', 'aim-v6-standard-touch').map(([value]) => value)).toEqual(['aim-v6-standard-touch']);
    expect(scopeChoices('cps', 'tps-v3-touch-10s').map(([value]) => value)).toEqual(['tps-v3-touch-10s']);
  }));
  test('history keeps saved input methods, legacy aliases and unknown revisions without empty choices', () => withStorage(storage => {
    storage.setItem(scoreKey('aim-v4-standard-mouse'), '[{"value":350}]');
    storage.setItem(scoreKey('aim-v3-touch'), '[{"value":400}]');
    storage.setItem(scoreKey('aim-v99-pen'), '[{"value":500}]');
    storage.setItem(scoreKey('aim-v4-compact-pen'), '[]');
    storage.setItem(scoreKey('reaction-v7-desktop'), '[{"value":250}]');
    expect(scopeChoices('aim', 'aim-v6-compact-touch').map(([value]) => value)).toEqual(['aim-v6-compact-touch', 'aim-v4-standard-mouse', 'aim-v3-touch', 'aim-v99-pen']);
    storage.setItem(scoreKey('reverse-v2-fresh'), '[{"value":4}]');
    expect(scopeChoices('reverse').map(([value]) => value)).toEqual(['reverse-v2-growing', 'reverse-v2-fresh']);
    expect(scopeChoices('reverse-fresh').map(([value]) => value)).toEqual(['reverse-v2-fresh']);
  }));
  test('legacy bests, damaged data and imported scores remain reachable', () => withStorage(storage => {
    storage.setItem('afterimage-best-standard', '12');
    storage.setItem(scoreKey('visual-v2-long'), '{opaque');
    expect(scopeChoices('visual').map(([value]) => value)).toEqual(['visual-v3-standard', 'visual-v2-long', 'visual']);
    const backup = JSON.stringify({ version: 2, data: { [scoreKey('visual-v2-standard')]: '[{"value":9}]' } });
    expect(importHistory(backup)).toBe(1);
    expect(scopeChoices('visual').map(([value]) => value)).toContain('visual-v2-standard');
    expect(readHistory('visual-v2-standard')).toEqual([{ value: 9 }]);
  }));
  test('progressive verbal rules preserve earlier scores as separate selectable histories', () => withStorage(storage => {
    const raw = '[{"value":42,"date":100,"rulesVersion":4,"custom":"keep"}]';
    storage.setItem(scoreKey('verbal-v4-balanced'), raw);
    expect(scopeChoices('verbal')).toEqual([
      ['verbal-v5-progressive', 'Current rules'], ['verbal-v4-balanced', 'Previous balanced rules'],
    ]);
    saveResult({ scope: 'verbal-v5-progressive', value: 17, unit: 'words', details: { rulesVersion: 5 } });
    expect(storage.getItem(scoreKey('verbal-v4-balanced'))).toBe(raw);
    expect(readHistory('verbal-v5-progressive')[0]).toMatchObject({ value: 17, rulesVersion: 5 });
    expect(referenceFor('verbal', 'verbal-v5-progressive')).toBeNull();
  }));
  test('hidden four-number Order rounds retain earlier visible-first-round scores separately', () => withStorage(storage => {
    const raw = '[{"value":8,"date":100,"rulesVersion":2,"custom":"keep"}]';
    storage.setItem(scoreKey('chimp-v2-standard-mouse'), raw);
    saveResult({ scope: 'chimp-v3-standard-mouse', value: 7, unit: 'numbers', details: { rulesVersion: 3 } });
    expect(initialScope('chimp')).toBe('chimp-v3-compact-mouse');
    expect(scopeChoices('chimp', 'chimp-v3-standard-mouse')).toContainEqual(['chimp-v2-standard-mouse', 'Earlier rules · Mouse · standard']);
    expect(storage.getItem(scoreKey('chimp-v2-standard-mouse'))).toBe(raw);
    expect(referenceFor('chimp', 'chimp-v3-standard-mouse')).toBeNull();
    expect(referenceFor('chimp', 'chimp-v2-standard-mouse')?.kind).toBe('histogram');
  }));
  test('Number Order timing from Start preserves earlier first-number timing separately', () => withStorage(storage => {
    for (const kind of ['mouse', 'touch', 'keyboard', 'pen']) {
      const earlier = `order-v1-${kind}`, current = `order-v2-${kind}`;
      const raw = '[{"value":12,"date":100,"rulesVersion":1,"custom":"keep"}]';
      storage.setItem(scoreKey(earlier), raw);
      saveResult({ scope: current, value: 18, unit: 's', lowerIsBetter: true, details: { rulesVersion: 2 } });
      expect(scopeChoices('number-order', current).map(([scope]) => scope)).toContain(earlier);
      expect(scopeChoices('number-order', current).find(([scope]) => scope === earlier)?.[1]).toStartWith('Earlier rules');
      expect(storage.getItem(scoreKey(earlier))).toBe(raw);
      expect(readHistory(current)).toHaveLength(1);
      expect(readHistory(current)[0]).toMatchObject({ value: 18, rulesVersion: 2 });
      expect(scopeUnit('number-order', current)).toEqual({ unit: 's', lower: true });
      expect(referenceFor('number-order', current)).toBeNull();
    }
  }));
  test('paused error review preserves continuous-clock histories separately', () => withStorage(storage => {
    for (const id of ['rotation', 'patterns', 'paper-folding', 'deduction', 'colour-match'] as const) {
      const earlierVersion = ['rotation', 'patterns'].includes(id) ? 3 : 1;
      const earlier = `${id}-v${earlierVersion}-60s`, current = initialScope(id);
      const raw = '[{"value":12,"date":100,"custom":"keep"}]';
      storage.setItem(scoreKey(earlier), raw);
      saveResult({ scope: current, value: 18, unit: 'points', details: { rulesVersion: earlierVersion + 1 } });
      expect(scopeChoices(id).find(([scope]) => scope === earlier)?.[1]).toStartWith('Earlier rules');
      expect(storage.getItem(scoreKey(earlier))).toBe(raw);
      expect(readHistory(current)).toHaveLength(1);
      expect(referenceFor(id, current)).toBeNull();
    }
  }));
  test('new challenge scores export and import independently without invented benchmarks', () => withStorage(storage => {
    for (const id of ['paper-folding', 'deduction', 'colour-match'] as const) {
      const scope = initialScope(id);
      saveResult({ scope, value: 12, unit: 'points', details: { correct: 15, errors: 3, rulesVersion: 2, duration: 60 } });
      expect(scopeUnit(id, scope)).toEqual({ unit: 'points', lower: false });
      expect(scopeChoices(id)).toEqual([[scope, id === 'deduction' ? 'Letters' : 'Current rules']]);
      expect(referenceFor(id, scope)).toBeNull();
    }
    const backup = exportHistory(); storage.clear();
    expect(importHistory(backup)).toBe(3);
    for (const id of ['paper-folding', 'deduction', 'colour-match'] as const) expect(readHistory(initialScope(id))[0]).toMatchObject({ value: 12, correct: 15, errors: 3, rulesVersion: 2, duration: 60 });
  }));
  test('Deduction letter and image scores stay separate while both older protocols remain selectable', () => withStorage(storage => {
    const originals = ['deduction-v1-60s', 'deduction-v2-60s'].map((scope, i) => [scope, `[ { "value": ${i + 4}, "date": 123, "custom": "keep" } ]`] as const);
    for (const [scope, raw] of originals) storage.setItem(scoreKey(scope), raw);
    saveResult({ scope: 'deduction-v3-letters-60s', value: 9, unit: 'points', details: { rulesVersion: 3 } });
    saveResult({ scope: 'deduction-v3-images-60s', value: 6, unit: 'points', details: { rulesVersion: 3 } });
    expect(initialScope('deduction')).toBe('deduction-v3-letters-60s');
    expect(scopeChoices('deduction', 'deduction-v3-images-60s')).toEqual([
      ['deduction-v3-images-60s', 'Images'], ['deduction-v3-letters-60s', 'Letters'],
      ['deduction-v2-60s', 'Earlier rules · letters'], ['deduction-v1-60s', 'Earlier rules · continuous clock'],
    ]);
    expect(readHistory('deduction-v3-letters-60s').map(row => row.value)).toEqual([9]);
    expect(readHistory('deduction-v3-images-60s').map(row => row.value)).toEqual([6]);
    for (const [scope, raw] of originals) expect(storage.getItem(scoreKey(scope))).toBe(raw);
    const backup = exportHistory(); storage.clear();
    expect(importHistory(backup)).toBe(4);
    for (const [scope, raw] of originals) expect(storage.getItem(scoreKey(scope))).toBe(raw);
    expect(readHistory('deduction-v3-letters-60s')[0].rulesVersion).toBe(3);
    expect(readHistory('deduction-v3-images-60s')[0].rulesVersion).toBe(3);
  }));
  test('archived typing aliases and future revisions remain selectable and restore byte for byte', () => withStorage(storage => {
    const preserved = new Map<string, string>();
    for (const [index, scope] of ['typing', 'typing-v3-hardware-60s', 'typing-v3-onscreen-60s', 'typing-v4-hardware-passage', 'typing-v4-onscreen-passage', 'typing-v99-custom'].entries()) {
      const raw = `[ { "value": ${40 + index}, "date": 123, "future": { "keep": true } } ]`;
      preserved.set(scoreKey(scope), raw);
      storage.setItem(scoreKey(scope), raw);
    }
    const choices = scopeChoices('typing').map(([scope]) => scoreKey(scope));
    for (const key of preserved.keys()) expect(choices).toContain(key);
    const backup = exportHistory();
    storage.clear();
    expect(importHistory(backup)).toBe(6);
    for (const [key, raw] of preserved) expect(storage.getItem(key)).toBe(raw);
    expect(readHistory('typing')[0].value).toBe(40);
  }));
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
      ['verbal', 'verbal-v5-progressive'], ['verbal', 'verbal-v4-balanced'], ['verbal', 'verbal'], ['sequence-fresh', 'sequence-v2-fresh'],
      ['visual', 'visual-v3-long'], ['typing', 'typing-v4-onscreen-passage'], ['number', 'number'],
      ['aim', 'aim-v4-compact-mouse'], ['aim', 'aim-v6-standard-touch'], ['aim', 'aim'], ['chimp', 'chimp-v2-standard-keyboard'], ['chimp', 'chimp-v2-compact-mouse'], ['chimp', 'chimp'],
      ['pairs', 'pairs-v4-mouse'], ['rotation', 'rotation-v3-60s'], ['cps', 'tps-v3-touch-10s'],
      ['chimp', 'chimp-v3-standard-mouse'], ['chimp', 'chimp-v3-compact-mouse'],
      ['paper-folding', 'paper-folding-v1-60s'], ['deduction', 'deduction-v1-60s'], ['colour-match', 'colour-match-v1-60s'],
    ];
    for (const [id, scope] of excluded) expect(referenceFor(id, scope)).toBeNull();
  });
  test('saved standard-board comparisons remain eligible while the active history format is compact', () => withStorage(storage => {
    for (const id of ['aim', 'chimp'] as const) {
      const standard = `${id}-${id === 'aim' ? 'v4' : 'v2'}-standard-mouse`;
      storage.setItem(scoreKey(standard), '[{"value":10,"date":100}]');
      expect(initialScope(id)).toContain('-compact-');
      expect(scopeChoices(id).map(([scope]) => scope)).toContain(standard);
      expect(referenceFor(id, standard)?.kind).toBe('histogram');
      expect(referenceFor(id, initialScope(id))).toBeNull();
    }
  }));
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
