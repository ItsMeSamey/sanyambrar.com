import { describe, expect, test } from 'bun:test';
import { createAfterimageNavigation } from '../src/games/afterimage/navigation.ts';
import type { GameId } from '../src/games/afterimage/types.ts';

const ids: GameId[] = ['visual', 'sequence', 'sequence-fresh', 'reverse', 'reverse-fresh', 'number-order', 'arithmetic', 'cps'];
function fixture(initialState: unknown = null, previous: unknown[] = [], saved?: string) {
  const entries: unknown[] = [...previous, initialState];
  let index = previous.length;
  let backs = 0;
  const values = new Map<string, string>(saved ? [['afterimage-navigation-v1', saved]] : []);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const history = {
    get state(): unknown { return entries[index]; },
    get length() { return entries.length; },
    replaceState(state: unknown) { entries[index] = state; },
    pushState(state: unknown) { entries.splice(index + 1); entries.push(state); index++; },
    back() { backs++; index = Math.max(0, index - 1); },
  };
  const navigation = createAfterimageNavigation(history, storage, ids);
  return { history, storage, navigation, entries, backs: () => backs, forward: () => { index = Math.min(entries.length - 1, index + 1); return navigation.restore(history.state); } };
}

describe('Afterimage browser navigation', () => {
  test('each game open adds one entry; Back and Forward restore that exact route', () => {
    const f = fixture();
    f.navigation.open('visual', 640);
    f.navigation.open('sequence-fresh', 0);
    expect(f.history.length).toBe(3);
    expect(f.navigation.back()).toBeNull();
    expect(f.backs()).toBe(1);
    expect(f.navigation.restore(f.history.state).game).toBe('visual');
    f.navigation.back();
    expect(f.navigation.restore(f.history.state)).toMatchObject({ game: null, selectedCard: 'visual', homeScroll: 640 });
    expect(f.forward().game).toBe('visual');
    expect(f.forward().game).toBe('sequence-fresh');
    expect(f.history.length).toBe(3);
  });

  test('reload trusts the current browser entry over a later session route', () => {
    const f = fixture();
    f.navigation.open('visual', 125);
    f.navigation.open('sequence-fresh', 0);
    f.navigation.back();
    const restored = createAfterimageNavigation(f.history, f.storage, ids);
    expect(restored.current()).toMatchObject({ game: 'visual', homeScroll: 125 });
    expect(f.history.length).toBe(3);
  });

  test('the brand opens the library as one entry, so Back returns to the game', () => {
    const f = fixture();
    f.navigation.open('visual', 500);
    expect(f.navigation.home()).toMatchObject({ game: null, homeScroll: 500 });
    expect(f.history.length).toBe(3);
    f.navigation.home();
    expect(f.history.length).toBe(3);
    f.navigation.back();
    expect(f.navigation.restore(f.history.state).game).toBe('visual');
  });

  test('a first library entry remembers it has no predecessor even with Forward entries', () => {
    const f = fixture();
    expect(f.navigation.canGoBack()).toBe(false);
    f.navigation.open('visual', 500);
    f.navigation.back();
    f.navigation.restore(f.history.state);
    expect(f.history.length).toBe(2);
    expect(f.navigation.canGoBack()).toBe(false);
    const restored = createAfterimageNavigation(f.history, f.storage, ids);
    expect(restored.canGoBack()).toBe(false);
  });

  test('library scroll and selected card belong to their source history entry', () => {
    const f = fixture();
    f.navigation.recordScroll(260);
    expect(f.history.length).toBe(1);
    f.navigation.open('visual', 310);
    f.navigation.recordScroll(0);
    f.navigation.back();
    expect(f.navigation.restore(f.history.state)).toMatchObject({ game: null, homeScroll: 310, selectedCard: 'visual' });
    f.navigation.open('sequence', 720);
    expect(f.history.length).toBe(2);
    f.navigation.back();
    expect(f.navigation.restore(f.history.state)).toMatchObject({ game: null, homeScroll: 720, selectedCard: 'sequence' });
  });

  test('a direct restored game has a library fallback without creating history', () => {
    const f = fixture(null, [], JSON.stringify({ version: 1, screen: 'play', game: 'sequence', variant: 'fresh', homeScroll: 420 }));
    expect(f.navigation.current().game).toBe('sequence-fresh');
    expect(f.navigation.back()).toMatchObject({ game: null, homeScroll: 420 });
    expect(f.backs()).toBe(0);
    expect(f.history.length).toBe(1);
  });

  test('an external previous entry is traversed once and is never rewritten', () => {
    const external = { otherApp: 'keep' };
    const f = fixture(null, [external], JSON.stringify({ version: 1, screen: 'play', game: 'visual', variant: null, homeScroll: 0 }));
    expect(f.navigation.back()).toBeNull();
    expect(f.backs()).toBe(1);
    expect(f.history.state).toEqual(external);
    expect(f.entries[0]).toEqual(external);
  });

  test('unknown popped entries become the library without resurrecting session gameplay', () => {
    const f = fixture();
    f.navigation.open('visual', 100);
    expect(f.navigation.restore(null)).toMatchObject({ game: null, homeScroll: 0 });
  });

  test('navigation preserves other history state and tolerates denied storage', () => {
    const f = fixture({ otherOwner: { keep: true } });
    const deniedStorage = { getItem(): never { throw new Error('denied'); }, setItem(): never { throw new Error('denied'); } };
    const navigation = createAfterimageNavigation(f.history, deniedStorage, ids);
    navigation.open('visual', 50);
    expect(f.history.state).toMatchObject({ otherOwner: { keep: true }, afterimage: { game: 'visual' } });
    navigation.back();
    expect(navigation.restore(f.history.state).game).toBeNull();
  });

  test.each(['order', 'math', 'tps'])('legacy %s aliases restore their current game', alias => {
    const f = fixture(null, [], JSON.stringify({ version: 1, screen: 'play', game: alias, variant: null, homeScroll: 12 }));
    expect(f.navigation.current().game).toBe(({ order: 'number-order', math: 'arithmetic', tps: 'cps' })[alias]);
  });

  test.each([-1, Infinity, 10000001])('invalid saved scroll %s cannot poison route restoration', homeScroll => {
    const f = fixture(null, [], JSON.stringify({ version: 2, game: 'visual', selectedCard: 'visual', homeScroll }));
    expect(f.navigation.current()).toMatchObject({ game: null, homeScroll: 0 });
  });
});
