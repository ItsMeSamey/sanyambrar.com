import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { applyTypingEdit, compareDigits, createWordDeck, makeNumber, numberRevealTime, typingMetrics } from './words-logic.ts';
import { vocabulary, wordFamilies, words, typingPassages } from './words-data.ts';

function seeded(seed) {
  return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
}

test('complete vocabulary and passage corpus remain available offline', () => {
  assert.equal(words.length, 2358);
  assert.equal(vocabulary.length, 2755);
  assert.equal(wordFamilies.length, 145);
  assert.equal(typingPassages.length, 8);
  for (const passage of typingPassages) assert.ok(passage.length > 250 && passage.endsWith('.'));
});

test('verbal deck balances three new and two repeats without a recent repeat', () => {
  const deck = createWordDeck(seeded(81)), recent = [], seen = new Set();
  let streak = 0, repeats = 0;
  for (let i = 0; i < 505; i++) {
    const next = deck.next();
    assert.equal(next.wasSeen, seen.has(next.word));
    assert.ok(!recent.includes(next.word));
    assert.ok(vocabulary.includes(next.word));
    if (i < 5) assert.equal(next.wasSeen, false);
    else if (next.wasSeen) repeats++;
    streak = next.wasSeen ? streak + 1 : 0;
    assert.ok(streak <= 2);
    if (i >= 5 && (i - 4) % 5 === 0) { assert.equal(repeats, 2); repeats = 0; }
    seen.add(next.word); deck.markSeen(next.word); recent.push(next.word);
    if (recent.length > 3) recent.shift();
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

test('typing edits distinguish entered characters from the identical reference suffix', () => {
  const passage = 'The quiet garden';
  assert.equal(applyTypingEdit({ text: '', value: passage, start: 0 }, 'T' + passage, 1), 'T');
  assert.equal(applyTypingEdit({ text: 'T', value: passage, start: 1 }, 'Th' + passage.slice(1), 2), 'Th');
  assert.equal(applyTypingEdit({ text: 'The', value: passage, start: 3 }, 'Th' + passage.slice(3), 2), 'Th');
  assert.equal(applyTypingEdit({ text: 'Txe', value: 'Txe quiet garden', start: 1 }, passage, 2), 'The');
  assert.equal(applyTypingEdit({ text: 'The', value: passage, start: 0 }, 'Hi quiet garden', 2), 'Hi');
});

test('typing speed and accuracy use corrected matching characters and elapsed minutes', () => {
  assert.deepEqual(typingMetrics('abcde', '', 0), { correct: 0, accuracy: 100, wpm: 0 });
  assert.deepEqual(typingMetrics('abcde', 'abxde', 6000), { correct: 4, accuracy: 80, wpm: 8 });
  assert.deepEqual(typingMetrics('abcde', 'abcde', 6000), { correct: 5, accuracy: 100, wpm: 10 });
});

