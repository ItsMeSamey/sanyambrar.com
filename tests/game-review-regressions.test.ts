import { describe, expect, test, spyOn } from 'bun:test';
import { canResumeReplay, compactMatchHistory } from '../src/games/chain/match-history.ts';
import { selectedGameStorageKey } from '../src/games/wordle/active-game-storage.ts';
import { gameStorageKey, type ChallengeConfig } from '../src/games/wordle/challenge.ts';
import { describeGuess, letterFeedback } from '../src/games/wordle/feedback.ts';
import { isKeyboardActivation } from '../src/games/wordle/pointer-input.ts';

type Match = { id: string; s: string; w: number; r: number; c: number; m: number[] };
const match = (id: string, s = 'completed', w = 1, r = 9, c = 6): Match => ({ id, s, w, r, c, m: [1, 2, 3] });
const totals = (db: { base: { games: number; wins: number; largest: number }; matches: Match[] }) => {
  const completed = db.matches.filter(item => item.s === 'completed');
  return {
    games: db.base.games + completed.length,
    wins: db.base.wins + completed.filter(item => item.w === 1).length,
    largest: Math.max(db.base.largest, 0, ...completed.map(item => item.r * item.c)),
  };
};

describe('Chain retained matches and all-time totals', () => {
  test('a new active match does not erase the oldest completed win or largest board', () => {
    const completed = Array.from({ length: 120 }, (_, index) => match(String(index), 'completed', index % 3 === 0 ? 2 : 1));
    completed[119] = match('largest', 'completed', 1, 30, 30);
    const db = { v: 1 as const, base: { games: 7, wins: 3, largest: 100 }, matches: [match('new', 'active', 0), ...completed] };
    const before = structuredClone(db);
    const compacted = compactMatchHistory(db);
    expect(totals(compacted)).toEqual(totals(db));
    expect(compacted.base).toEqual({ games: 8, wins: 4, largest: 900 });
    expect(compacted.matches).toHaveLength(120);
    expect(compacted.matches[0]).toBe(db.matches[0]);
    expect(compacted.matches.some(item => item.id === 'largest')).toBe(false);
    expect(db).toEqual(before);
    expect(compactMatchHistory(compacted)).toEqual(compacted);
  });

  test('multiple overflow loads preserve wins, losses and unfinished replay records', () => {
    const db = {
      v: 1 as const,
      base: { games: 10, wins: 4, largest: 1000 },
      matches: [
        ...Array.from({ length: 123 }, (_, index) => match(String(index), 'completed', index % 2 ? 1 : 2)),
        match('old-active', 'active', 0),
        match('old-abandoned', 'abandoned', 0),
        match('last-win'),
      ],
    };
    const compacted = compactMatchHistory(db);
    expect(totals(compacted)).toEqual(totals(db));
    expect(compacted.matches.find(item => item.id === 'old-active')).toEqual(db.matches[123]);
    expect(compacted.matches.find(item => item.id === 'old-abandoned')).toEqual(db.matches[124]);
    const reloaded = JSON.parse(JSON.stringify(compacted));
    expect(compactMatchHistory(reloaded)).toEqual(compacted);
    expect(totals(compactMatchHistory(reloaded))).toEqual(totals(db));
  });

  test('completed replay frames never fork a duplicate result', () => {
    expect(canResumeReplay({ winner: 0 }, false)).toBe(true);
    expect(canResumeReplay({ winner: 1 }, false)).toBe(false);
    expect(canResumeReplay({ winner: 2 }, false)).toBe(false);
    expect(canResumeReplay({ winner: 0 }, true)).toBe(false);
    expect(canResumeReplay(undefined, false)).toBe(false);
  });
});

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) { values.set(key, value); },
    removeItem(key: string) { values.delete(key); },
  };
}

const config: ChallengeConfig = { mode: 'advanced', wordLength: 5, maxTries: 6, disabledLetters: 0, allowAny: false, wordIndex: 767 };
const saved = JSON.stringify({
  config: { mode: 'advanced', wordLength: 5, maxTries: 6, disabledLetters: 0, allowAny: false },
  word: 'apple',
  history: [['crate', 'rrryr'], ['ap', '']],
  disabled: '',
  legacyExtra: { preserve: 'verbatim' },
});

describe('Wordle exact saved-game selection', () => {
  for (const key of [
    'game.wordle.advanced.5.6.0.0',
    'game.wordle.advanced.5.6.0',
    'game.wordle.advanced.any.5.6.0',
    'game.wordle.5.6',
    'game.wordle.any.5.6',
    'game.wordle.random.5.6.0.0',
  ]) {
    test(`migrates the selected ${key} verbatim and survives reload`, () => {
      const storage = memoryStorage({ [key]: saved });
      const target = gameStorageKey(config);
      expect(selectedGameStorageKey(config, key, storage)).toBe(target);
      expect(storage.getItem(target)).toBe(saved);
      expect(storage.getItem(key)).toBeNull();
      expect(selectedGameStorageKey(config, undefined, storage)).toBe(target);
      expect(JSON.parse(storage.getItem(target)!).history).toEqual([['crate', 'rrryr'], ['ap', '']]);
    });
  }

  test('a canonical collision preserves both raw records and resumes the selected one after reload', () => {
    const source = 'game.wordle.advanced.5.6.0.0';
    const target = gameStorageKey(config);
    const other = JSON.stringify({ wordIndex: 767, history: [['plate', 'rggrg'], ['', '']], config });
    const storage = memoryStorage({ [source]: saved, [target]: other });
    expect(selectedGameStorageKey(config, source, storage)).toBe(source);
    expect(storage.getItem(source)).toBe(saved);
    expect(storage.getItem(target)).toBe(other);
    expect(selectedGameStorageKey(config, undefined, storage)).toBe(source);
    const anotherChallenge = { ...config, wordIndex: 768 };
    expect(selectedGameStorageKey(anotherChallenge, undefined, storage)).toBe(gameStorageKey(anotherChallenge));
    expect(storage.getItem(source)).toBe(saved);
    expect(storage.getItem(target)).toBe(other);
  });

  test('a failed destination write leaves the selected source untouched and usable', () => {
    const source = 'game.wordle.any.5.6';
    const storage = memoryStorage({ [source]: saved });
    const warning = spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(selectedGameStorageKey(config, source, {
        ...storage,
        setItem: () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); },
      })).toBe(source);
      expect(storage.getItem(source)).toBe(saved);
      expect(storage.getItem(gameStorageKey(config))).toBeNull();
    } finally { warning.mockRestore(); }
  });

  test('a failed read-back never deletes the original after copying it', () => {
    const source = 'game.wordle.any.5.6';
    const target = gameStorageKey(config);
    const storage = memoryStorage({ [source]: saved });
    let copied = false;
    const warning = spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(selectedGameStorageKey(config, source, {
        ...storage,
        getItem(key) {
          if (copied && key === target) throw new DOMException('Access denied', 'SecurityError');
          return storage.getItem(key);
        },
        setItem(key, value) { storage.setItem(key, value); copied = true; },
      })).toBe(source);
      expect(storage.getItem(source)).toBe(saved);
      expect(storage.getItem(target)).toBe(saved);
    } finally { warning.mockRestore(); }
  });

  test('does not treat settings or unrelated records as a selected game', () => {
    const storage = memoryStorage({ 'game.wordle.settings.hard': saved, unrelated: saved });
    for (const source of ['game.wordle.settings.hard', 'unrelated']) {
      expect(selectedGameStorageKey(config, source, storage)).toBe(gameStorageKey(config));
      expect(storage.getItem(source)).toBe(saved);
    }
    expect(storage.getItem(gameStorageKey(config))).toBeNull();
  });
});

describe('Wordle feedback without relying on color', () => {
  test('announces position and result for every evaluated letter', () => {
    expect(describeGuess('crate', 'gyrrg')).toBe('Position 1: C, correct position; Position 2: R, present in another position; Position 3: A, absent; Position 4: T, absent; Position 5: E, correct position');
  });

  test('revealed answers and unsubmitted letters have distinct meanings', () => {
    expect(describeGuess('apple', 'bbbbb')).toContain('Position 1: A, revealed');
    expect(describeGuess('apple', 'bbbbb')).not.toContain('correct position');
    expect(describeGuess('ap ', '')).toContain('Position 3: empty, not submitted');
    expect(describeGuess('     ', '')).toBe('Empty guess');
    expect(letterFeedback('')).toBe('not submitted');
  });
});

test('Wordle compatibility pointer clicks do not masquerade as native keyboard activation', () => {
  expect(isKeyboardActivation({ detail: 0 })).toBe(true);
  expect(isKeyboardActivation({ detail: 0, pointerType: '' })).toBe(true);
  expect(isKeyboardActivation({ detail: 1 })).toBe(false);
  for (const pointerType of ['touch', 'pen', 'mouse']) {
    expect(isKeyboardActivation({ detail: 0, pointerType })).toBe(false);
  }
  expect(isKeyboardActivation({ detail: 0, sourceCapabilities: { firesTouchEvents: true } })).toBe(false);
});
