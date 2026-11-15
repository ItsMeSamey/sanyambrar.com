import { vocabulary, wordFamilies } from './words-data.ts';

export function createWordDeck(random = Math.random) {
  const seen = new Set<string>();
  let word = '', mix: boolean[] = [], recent: string[] = [], repeatStreak = 0;
  return {
    markSeen(value: string) { seen.add(value); },
    next() {
      const repeats = [...seen].filter(candidate => !recent.includes(candidate));
      const unseen = vocabulary.filter(candidate => candidate !== word && !seen.has(candidate));
      let repeat = false;
      if (unseen.length && seen.size >= 5 && repeats.length) {
        if (!mix.length) mix = [false, false, false, true, true];
        const choices = mix.map((value, index) => ({ value, index })).filter(({ value }) => !value || repeatStreak < 2);
        const pick = choices[Math.floor(random() * choices.length)];
        repeat = mix.splice(pick.index, 1)[0];
      }
      let pool = repeats;
      if (unseen.length && !repeat) {
        const related = [...new Set(wordFamilies.filter(family => family.some(candidate => seen.has(candidate))).flat())]
          .filter(candidate => candidate !== word && !seen.has(candidate));
        pool = related.length && random() < 0.5 ? related : unseen;
      }
      word = pool[Math.floor(random() * pool.length)];
      const wasSeen = seen.has(word);
      repeatStreak = wasSeen ? repeatStreak + 1 : 0;
      recent = [...recent.slice(-2), word];
      return { word, wasSeen };
    },
  };
}

export const numberRevealTime = (digits: number) => 1000 + digits * 800;

export function makeNumber(digits: number, random = Math.random) {
  let value = String(1 + Math.floor(random() * 9));
  for (let i = 1; i < digits; i++) value += Math.floor(random() * 10);
  return value;
}

export function compareDigits(expected: string, entered: string) {
  return Array.from({ length: Math.max(expected.length, entered.length) }, (_, i) => ({
    expected: expected[i] || '', actual: entered[i] || '',
    kind: !expected[i] ? 'extra' : !entered[i] ? 'missing' : expected[i] === entered[i] ? 'match' : 'wrong',
  }));
}

export function typingMetrics(passage: string, typed: string, elapsed: number) {
  let correct = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] === passage[i]) correct++;
  return { correct, accuracy: typed.length ? Math.round(100 * correct / typed.length) : 100,
    wpm: elapsed > 0 ? Math.round(correct / 5 / (elapsed / 60000)) : 0 };
}

export type PendingTypingEdit = { text: string; value: string; start: number };

// The native input includes an uneditable reference suffix so text and caret wrap alike.
export function applyTypingEdit(edit: PendingTypingEdit, after: string, caret: number) {
  const before = edit.value;
  let start = 0, oldEnd = before.length, newEnd = after.length;
  const anchor = Math.min(edit.start, caret);
  while (start < anchor && start < oldEnd && start < newEnd && before[start] === after[start]) start++;
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) { oldEnd--; newEnd--; }
  return edit.text.slice(0, Math.min(start, edit.text.length)) + after.slice(start, newEnd) + edit.text.slice(Math.min(oldEnd, edit.text.length));
}
