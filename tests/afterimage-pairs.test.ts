import { describe, expect, test } from 'bun:test';
import { createPairDeck, pairArtwork, selectPairObjects } from '../src/games/afterimage/pair-objects.ts';

describe('pair memory artwork and increasing rounds', () => {
  test('keeps all 64 distinct colorful objects before numeric overflow', () => {
    const objects = selectPairObjects(65, () => 0.25);
    expect(new Set(objects.map(object => object.name)).size).toBe(65);
    expect(objects.slice(0, 64).every(object => object.svg?.includes('fill=') && object.viewBox === '0 0 32 32')).toBe(true);
    expect(objects[64]).toEqual({ name: '1', number: 1 });
  });

  test('each face has independent gradient and filter IDs, including across runs', () => {
    const object = selectPairObjects(1, () => 0)[0];
    const first = pairArtwork(object);
    const second = pairArtwork(object);
    expect(first).not.toContain('__PAIR_ID__');
    expect(first).not.toBe(second);
    const firstIds = new Set([...first.matchAll(/id="([^"]+)"/g)].map(match => match[1]));
    const secondIds = [...second.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
    expect(firstIds.size).toBeGreaterThan(0);
    expect(secondIds.every(id => !firstIds.has(id))).toBe(true);
    expect([...first.matchAll(/url\(#([^)]+)\)/g)].every(match => firstIds.has(match[1]))).toBe(true);
  });

  test.each([0, 1, 62, 63, 98])('round index %i always deals exactly two of each object', round => {
    const deck = createPairDeck(round, () => 0.4);
    expect(deck).toHaveLength((round + 2) * 2);
    expect(new Set(deck.map(card => card.object.name)).size).toBe(round + 2);
    for (const value of new Set(deck.map(card => card.value))) {
      const pair = deck.filter(card => card.value === value);
      expect(pair).toHaveLength(2);
      expect(pair[0].object).toBe(pair[1].object);
      if (pair[0].object.svg) expect(pair[0].artwork).not.toBe(pair[1].artwork);
    }
    expect(deck.map(card => card.index)).toEqual(Array.from({ length: deck.length }, (_, index) => index));
  });
});
