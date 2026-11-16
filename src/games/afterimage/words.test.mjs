import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { compareDigits, createWordDeck, makeNumber, numberRevealTime, verbalRepeatChance, verbalRepeatProbability } from './words-logic.ts';
import { vocabulary, wordFamilies, words } from './words-data.ts';

function seeded(seed) {
  return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
}

test('the large vocabulary and related-word families remain available offline', () => {
  assert.equal(words.length, 2358);
  assert.equal(vocabulary.length, 2755);
  assert.equal(wordFamilies.length, 145);
});

test('repeat probability increases smoothly with memory load and stays below 55 percent', () => {
  assert.equal(verbalRepeatProbability(0), 0);
  let previous = 0;
  for (let count = 1; count <= vocabulary.length; count++) {
    const probability = verbalRepeatProbability(count);
    assert.ok(probability >= previous && probability <= 0.55);
    assert.ok(probability - previous < 0.05);
    previous = probability;
  }
  assert.ok(verbalRepeatProbability(2) > 0.08);
  assert.ok(verbalRepeatProbability(5) < 0.2);
  assert.ok(verbalRepeatProbability(50) > 0.54);
});

test('long answer streaks are softened while both choices retain a chance', () => {
  for (const count of [2, 5, 50, 500]) {
    const base = verbalRepeatProbability(count);
    assert.equal(verbalRepeatChance(count, 2), base);
    assert.equal(verbalRepeatChance(count, -3), base);
    assert.ok(verbalRepeatChance(count, 5) < verbalRepeatChance(count, 3));
    assert.ok(verbalRepeatChance(count, -6) > verbalRepeatChance(count, -4));
    for (const streak of [-100, -10, -4, 3, 10, 100]) {
      assert.ok(verbalRepeatChance(count, streak) > 0 && verbalRepeatChance(count, streak) < 1);
    }
  }
  assert.equal(verbalRepeatChance(0, -100), 0);
});

test('seeded runs progress from occasional repeats to a larger familiar-word share', () => {
  const groups = [5, 15, 40, Infinity].map(limit => ({ limit, draws: 0, repeats: 0, expected: 0 }));
  let longestSeen = 0, longestNew = 0;
  for (let seed = 1; seed <= 64; seed++) {
    const deck = createWordDeck(seeded(Math.imul(seed, 0x9e3779b1)));
    const seen = new Set();
    let previous = '', streak = 0;
    for (let turn = 0; turn < 240; turn++) {
      const group = groups.find(group => seen.size <= group.limit);
      const next = deck.next();
      group.draws++;
      group.expected += seen.size < 2 ? 0 : verbalRepeatChance(seen.size, streak);
      group.repeats += Number(next.wasSeen);
      streak = next.wasSeen ? Math.max(0, streak) + 1 : Math.min(0, streak) - 1;
      longestSeen = Math.max(longestSeen, streak); longestNew = Math.max(longestNew, -streak);
      assert.equal(next.wasSeen, seen.has(next.word));
      assert.notEqual(next.word, previous);
      seen.add(next.word); deck.markSeen(next.word); previous = next.word;
    }
  }
  let previousRate = 0;
  for (const group of groups) {
    const rate = group.repeats / group.draws;
    assert.ok(Math.abs(rate - group.expected / group.draws) < 0.055, JSON.stringify(group));
    assert.ok(rate > previousRate, JSON.stringify(groups));
    previousRate = rate;
  }
  assert.ok(groups[0].repeats > 0);
  assert.ok(longestSeen <= 10 && longestNew <= 14, JSON.stringify({ longestSeen, longestNew }));
});

test('older words have a higher per-candidate repeat rate without excluding recent words', () => {
  const deck = createWordDeck(seeded(9981));
  const pool = vocabulary.slice(0, 48), known = new Set(pool), lastShown = new Map();
  for (const word of pool) deck.markSeen(word);
  let recentExposure = 0, oldExposure = 0, recentPicks = 0, oldPicks = 0, shortRepeats = 0, previous = '';
  for (let turn = 0; turn < 6000; turn++) {
    const age = word => turn - (lastShown.get(word) ?? -48);
    for (const word of pool) {
      if (word === previous) continue;
      if (age(word) <= 12) recentExposure++;
      if (age(word) >= 24) oldExposure++;
    }
    const next = deck.next();
    assert.notEqual(next.word, previous);
    if (known.has(next.word)) {
      if (age(next.word) <= 12) recentPicks++;
      if (age(next.word) >= 24) oldPicks++;
      if (age(next.word) <= 3) shortRepeats++;
    }
    lastShown.set(next.word, turn); previous = next.word;
  }
  assert.ok(recentPicks > 0 && shortRepeats > 0);
  assert.ok(oldPicks / oldExposure > 2 * recentPicks / recentExposure,
    JSON.stringify({ oldPicks, oldExposure, recentPicks, recentExposure }));
});

test('long runs explore the vocabulary and an exhausted deck still returns nonadjacent familiar words', () => {
  const deck = createWordDeck(seeded(81)), seen = new Set();
  let previous = '';
  for (let turn = 0; turn < 4000; turn++) {
    const next = deck.next();
    assert.ok(vocabulary.includes(next.word));
    assert.equal(next.wasSeen, seen.has(next.word));
    assert.notEqual(next.word, previous);
    seen.add(next.word); deck.markSeen(next.word); previous = next.word;
  }
  assert.ok(seen.size > 1400);
  for (const word of vocabulary) deck.markSeen(word);
  for (let turn = 0; turn < 100; turn++) {
    const next = deck.next();
    assert.ok(next.wasSeen && vocabulary.includes(next.word));
    assert.notEqual(next.word, previous);
    previous = next.word;
  }
});

test('number levels preserve original duration, leading digit, and positional comparison', () => {
  assert.equal(numberRevealTime(1), 1800);
  assert.equal(numberRevealTime(128), 103400);
  for (const size of [1, 2, 16, 128]) {
    const number = makeNumber(size, seeded(size));
    assert.equal(number.length, size); assert.match(number, /^[1-9]\d*$/);
  }
  assert.deepEqual(compareDigits('12345', '1345').map(pair => pair.kind), ['match', 'wrong', 'wrong', 'wrong', 'missing']);
  assert.deepEqual(compareDigits('12', '123').map(pair => pair.kind), ['match', 'match', 'extra']);
});
