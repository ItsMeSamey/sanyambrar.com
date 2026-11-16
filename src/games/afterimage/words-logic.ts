import { vocabulary, wordFamilies } from './words-data.ts';

// Grow smoothly into a mix of familiar and new words as memory load increases.
export const verbalRepeatProbability = (seenCount: number) => 0.55 * (1 - Math.exp(-Math.max(0, seenCount) / 12));

export function verbalRepeatChance(seenCount: number, streak = 0) {
  const base = verbalRepeatProbability(seenCount);
  if (!base) return 0;
  // Soften long runs of either answer without imposing a predictable cadence.
  const chance = streak > 2 ? base * 0.65 ** (streak - 2)
    : streak < -3 ? 1 - (1 - base) * 0.8 ** (-streak - 3) : base;
  return Math.max(0.01, Math.min(0.99, chance));
}

export function createWordDeck(random = Math.random) {
  const seen = new Set<string>();
  const lastPresented = new Map<string, number>();
  let word = '', turn = 0, streak = 0;
  return {
    markSeen(value: string) { seen.add(value); },
    next() {
      const repeats = [...seen].filter(candidate => candidate !== word);
      const unseen = vocabulary.filter(candidate => candidate !== word && !seen.has(candidate));
      const repeat = repeats.length > 0 && (!unseen.length || random() < verbalRepeatChance(seen.size, streak));
      if (repeat) {
        // Recently shown words recover weight gradually; old words retain a bounded
        // advantage so a long run does not permanently starve the newer vocabulary.
        const weights = repeats.map(candidate => Math.min(48, turn - (lastPresented.get(candidate) ?? -48)));
        let pick = random() * weights.reduce((sum, weight) => sum + weight, 0);
        word = repeats[repeats.length - 1];
        for (let i = 0; i < repeats.length; i++) {
          pick -= weights[i];
          if (pick < 0) { word = repeats[i]; break; }
        }
      } else {
        const related = [...new Set(wordFamilies.filter(family => family.some(candidate => seen.has(candidate))).flat())]
          .filter(candidate => candidate !== word && !seen.has(candidate));
        const pool = related.length && random() < 0.5 ? related : unseen;
        word = pool[Math.floor(random() * pool.length)];
      }
      const wasSeen = seen.has(word);
      streak = wasSeen ? Math.max(0, streak) + 1 : Math.min(0, streak) - 1;
      lastPresented.set(word, turn++);
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
