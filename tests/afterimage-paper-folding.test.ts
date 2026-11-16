import { describe, expect, test } from 'bun:test';
import { createPaperFoldingQuestion, foldPaper, paperPatternKey, unfoldPaper, wholePaper, type FoldDirection, type PaperFold, type PaperPoint } from '../src/games/afterimage/paper-folding-model.ts';

function seeded(seed: number) {
  return () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
}
function foldsFor(directions: FoldDirection[]): PaperFold[] {
  const folds: PaperFold[] = [];
  let bounds = wholePaper;
  for (const direction of directions) { const fold = foldPaper(bounds, direction); folds.push(fold); bounds = fold.after; }
  return folds;
}

// Independent oracle: track every point of the original sheet forward through the folds.
function forwardHoles(folds: readonly PaperFold[], punches: readonly PaperPoint[]): PaperPoint[] {
  const result: PaperPoint[] = [];
  for (let oy = 1; oy < 64; oy++) for (let ox = 1; ox < 64; ox++) {
    let x = ox, y = oy;
    for (const { direction, before } of folds) {
      if (direction === 'right') x = Math.max(x, before.left + before.right - x);
      if (direction === 'left') x = Math.min(x, before.left + before.right - x);
      if (direction === 'down') y = Math.max(y, before.top + before.bottom - y);
      if (direction === 'up') y = Math.min(y, before.top + before.bottom - y);
    }
    if (punches.some(([px, py]) => x === px && y === py)) result.push([ox, oy]);
  }
  return result;
}

describe('Paper Folding physical model', () => {
  test('known folds create the expected reflected holes, including an off-centre third crease', () => {
    expect(unfoldPaper(foldsFor(['right']), [[40, 16]])).toEqual([[24, 16], [40, 16]]);
    expect(unfoldPaper(foldsFor(['right', 'down']), [[40, 40]])).toEqual([[24, 24], [40, 24], [24, 40], [40, 40]]);
    expect(unfoldPaper(foldsFor(['right', 'down', 'left']), [[36, 40]])).toEqual([
      [4, 24], [28, 24], [36, 24], [60, 24], [4, 40], [28, 40], [36, 40], [60, 40],
    ]);
  });
  test('every fold halves the current sheet and keeps the side named by its direction', () => {
    for (const first of ['left', 'right', 'up', 'down'] as const) for (const second of ['left', 'right', 'up', 'down'] as const) {
      for (const { direction, before, after } of foldsFor([first, second])) {
        const area = (bounds: typeof wholePaper) => (bounds.right - bounds.left) * (bounds.bottom - bounds.top);
        expect(area(after)).toBe(area(before) / 2);
        expect(after.left).toBeGreaterThanOrEqual(before.left); expect(after.top).toBeGreaterThanOrEqual(before.top);
        expect(after.right).toBeLessThanOrEqual(before.right); expect(after.bottom).toBeLessThanOrEqual(before.bottom);
        if (direction === 'left') expect(after.left).toBe(before.left);
        if (direction === 'right') expect(after.right).toBe(before.right);
        if (direction === 'up') expect(after.top).toBe(before.top);
        if (direction === 'down') expect(after.bottom).toBe(before.bottom);
      }
    }
  });
  test('inverse construction agrees with forward simulation across varied folds and multiple punches', () => {
    const random = seeded(1738);
    for (let round = 0; round < 120; round++) {
      const question = createPaperFoldingQuestion(round, random);
      expect(question.patterns[question.correct]).toEqual(forwardHoles(question.folds, question.punches));
    }
  });
  test('all choices are unique with equal hole counts and enough space between holes and edges', () => {
    const random = seeded(991);
    for (let round = 0; round < 400; round++) {
      const q = createPaperFoldingQuestion(round, random);
      expect(q.patterns).toHaveLength(4); expect(new Set(q.patterns.map(paperPatternKey)).size).toBe(4);
      expect(new Set(q.options).size).toBe(4); expect(q.options).toHaveLength(4);
      expect(q.correct).toBeGreaterThanOrEqual(0); expect(q.correct).toBeLessThan(4);
      const stack = q.folds.at(-1)!.after;
      for (const [x, y] of q.punches) {
        expect(x - stack.left).toBeGreaterThanOrEqual(4); expect(stack.right - x).toBeGreaterThanOrEqual(4);
        expect(y - stack.top).toBeGreaterThanOrEqual(4); expect(stack.bottom - y).toBeGreaterThanOrEqual(4);
      }
      for (const pattern of q.patterns) {
        expect(pattern).toHaveLength(q.punches.length * 2 ** q.folds.length);
        expect(new Set(pattern.map(String)).size).toBe(pattern.length);
        for (const [x, y] of pattern) {
          expect(x).toBeGreaterThanOrEqual(4); expect(x).toBeLessThanOrEqual(60);
          expect(y).toBeGreaterThanOrEqual(4); expect(y).toBeLessThanOrEqual(60);
        }
        for (let i = 0; i < pattern.length; i++) for (let j = i + 1; j < pattern.length; j++) {
          expect(Math.hypot(pattern[i][0] - pattern[j][0], pattern[i][1] - pattern[j][1])).toBeGreaterThanOrEqual(4);
        }
      }
    }
  });
  test('runs introduce complexity progressively and explore directions, sites and answer slots', () => {
    const random = seeded(445), identities = new Set<string>(), directions = new Set<string>();
    const answers = [0, 0, 0, 0], foldCounts = new Set<number>(), punchCounts = new Set<number>();
    for (let round = 0; round < 500; round++) {
      const q = createPaperFoldingQuestion(round, random);
      if (round < 3) expect(q.folds).toHaveLength(1);
      if (round >= 3 && round < 8) expect(q.folds).toHaveLength(2);
      if (round < 12) expect(q.punches).toHaveLength(1);
      foldCounts.add(q.folds.length); punchCounts.add(q.punches.length); answers[q.correct]++;
      q.folds.forEach(fold => directions.add(fold.direction));
      identities.add(`${q.folds.map(fold => fold.direction).join(',')}:${paperPatternKey(q.punches)}`);
    }
    expect([...foldCounts].sort()).toEqual([1, 2, 3]); expect([...punchCounts].sort()).toEqual([1, 2]);
    expect(directions.size).toBe(4); expect(identities.size).toBeGreaterThan(180);
    answers.forEach(count => expect(count).toBeGreaterThan(85));
  });
  test('constant random sources still terminate and yield four valid distinct options', () => {
    for (const value of [0, 0.5, 0.999999]) for (const round of [0, 4, 8, 15, 100]) {
      const q = createPaperFoldingQuestion(round, () => value);
      expect(new Set(q.patterns.map(paperPatternKey)).size).toBe(4);
      expect(q.patterns[q.correct]).toEqual(forwardHoles(q.folds, q.punches));
    }
  });
});
