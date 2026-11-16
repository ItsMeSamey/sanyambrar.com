import { rotationShapes, type Cell } from './thinking-shapes.ts';

export type ThinkingMode = 'stroop' | 'arithmetic' | 'rotation' | 'patterns' | 'search';
export type Random = () => number;
const pick = (count: number, random: Random) => Math.floor(random() * count);
export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = pick(i + 1, random);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export const colorNames = ['Red', 'Blue', 'Green', 'Yellow'];
export const inkColors = ['light-dark(#bc2445, #ff7e94)', 'light-dark(#2369bd, #80baff)', 'light-dark(#23794b, #75e5aa)', 'light-dark(#986500, #ffe288)'];
export type RotationQuestion = { type: 'rotation'; original: readonly Cell[]; comparison: readonly Cell[]; angle: number; referenceAngle: number; mirrored: boolean; correct: number; shapeIndex: number };
export type PatternQuestion = { type: 'patterns'; values: number[]; answer: number; options: number[]; rule: string; correct: number };
export type SearchQuestion = { type: 'search'; correct: number; angles: number[] };
export type StroopQuestion = { type: 'stroop'; pair: number; printed: number; correct: number };
export type ArithmeticQuestion = { type: 'arithmetic'; a: number; b: number; operator: string; answer: number };
export type Question = RotationQuestion | PatternQuestion | SearchQuestion | StroopQuestion | ArithmeticQuestion;
export function pattern(round: number, random: Random = Math.random): PatternQuestion {
  const start = 2 + pick(8, random), step = 2 + pick(5, random), kind = round % 4;
  let values: number[], rule: string;
  if (kind === 0) { values = Array.from({ length: 5 }, (_, i) => start + step * i); rule = `Add ${step} each time`; }
  else if (kind === 1) { values = Array.from({ length: 5 }, (_, i) => start * 2 ** i); rule = 'Double each number'; }
  else if (kind === 2) { values = [start]; for (let i = 1; i < 5; i++) values.push(values[i - 1] + step + i - 1); rule = `Add ${step}, ${step + 1}, ${step + 2}, then ${step + 3}`; }
  else { values = [start]; for (let i = 1; i < 5; i++) values.push(values[i - 1] + (i % 2 ? step : 1)); rule = `Alternate adding ${step} and adding 1`; }
  const answer = values.pop()!;
  const options = shuffle([answer, answer + 1, answer - 1, answer + step + 2], random);
  return { type: 'patterns', values, answer, options, rule, correct: options.indexOf(answer) };
}
export function rotation(shapeIndex: number, kind: number, random: Random = Math.random): RotationQuestion {
  const [original, changed] = rotationShapes[shapeIndex];
  return { type: 'rotation', original, comparison: kind === 2 ? changed : original, mirrored: kind === 1, correct: kind, shapeIndex, angle: [45, 90, 135, 180, 225, 270, 315][pick(7, random)], referenceAngle: pick(8, random) * 45 };
}
export function search(random: Random = Math.random): SearchQuestion {
  const correct = pick(16, random), angle = pick(4, random) * 90;
  return { type: 'search', correct, angles: Array.from({ length: 16 }, (_, i) => angle + (i === correct ? 90 : 0)) };
}
export function stroop(previous = -1, random: Random = Math.random): StroopQuestion {
  let pair = pick(12, random);
  if (pair === previous) pair = (pair + 1) % 12;
  const correct = Math.floor(pair / 3);
  return { type: 'stroop', pair, correct, printed: (correct + 1 + pair % 3) % 4 };
}
export function arithmetic(random: Random = Math.random): ArithmeticQuestion {
  const a = 2 + pick(18, random), b = 2 + pick(12, random), op = pick(3, random);
  return { type: 'arithmetic', a, b, operator: ['+', '−', '×'][op], answer: op === 0 ? a + b : op === 1 ? a - b : a * b };
}
export function protocol(mode: ThinkingMode) {
  return { duration: mode === 'search' || mode === 'stroop' ? 30 : 60, scope: { stroop: 'stroop-v2-30s', arithmetic: 'math', rotation: 'rotation-v4-60s', patterns: 'patterns-v4-60s', search: 'search-v2-30s' }[mode] };
}
export function secondsLeft(deadline: number, now: number) { return Math.max(0, Math.ceil((deadline - now) / 1000)); }
export function acceptsAnswer(deadline: number, now: number) { return now < deadline; }
export function points(correct: number, errors: number) { return Math.max(0, correct - errors); }
export function arithmeticPoints(score: number, good: boolean) { return Math.max(0, score + (good ? 1 : -1)); }
export function createQuestionFactory(mode: ThinkingMode, random: Random = Math.random) {
  let deck: number[] = [], kinds: number[] = [], previousShape = -1, previousPair = -1;
  return (round: number): Question => {
    if (mode === 'patterns') return pattern(round, random);
    if (mode === 'search') return search(random);
    if (mode === 'arithmetic') return arithmetic(random);
    if (mode === 'stroop') { const question = stroop(previousPair, random); previousPair = question.pair; return question; }
    if (!deck.length) {
      deck = shuffle(rotationShapes.map((_, i) => i), random);
      if (deck.at(-1) === previousShape) [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]];
    }
    if (!kinds.length) kinds = shuffle([0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2], random);
    previousShape = deck.pop()!;
    return rotation(previousShape, kinds.pop()!, random);
  };
}
