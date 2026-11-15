import { describe, expect, test } from 'bun:test';
import { acceptsAnswer, arithmetic, arithmeticPoints, createQuestionFactory, pattern, points, protocol, rotation, search, secondsLeft, stroop, type RotationQuestion } from '../src/games/afterimage/thinking-core.ts';
import { rotationShapes } from '../src/games/afterimage/thinking-shapes.ts';

function seeded(seed: number) {
  return () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
}
describe('thinking protocols and monotonic deadlines', () => {
  test('preserves original scope and duration', () => {
    expect(protocol('arithmetic')).toEqual({ duration: 60, scope: 'math' });
    expect(protocol('stroop')).toEqual({ duration: 30, scope: 'stroop-v2-30s' });
    expect(protocol('rotation')).toEqual({ duration: 60, scope: 'rotation-v3-60s' });
    expect(protocol('patterns')).toEqual({ duration: 60, scope: 'patterns-v3-60s' });
    expect(protocol('search')).toEqual({ duration: 30, scope: 'search-v2-30s' });
  });
  test('rounds visible time up but rejects answers exactly at the deadline', () => {
    expect(secondsLeft(60000, 59000.001)).toBe(1);
    expect(acceptsAnswer(60000, 59999.999)).toBe(true);
    expect(acceptsAnswer(60000, 60000)).toBe(false);
    expect(secondsLeft(60000, 90000)).toBe(0);
    expect(acceptsAnswer(60000, 90000)).toBe(false);
  });
  test('arithmetic floors each answer; the other games floor the final net score', () => {
    expect(arithmeticPoints(arithmeticPoints(0, false), true)).toBe(1);
    expect(points(1, 1)).toBe(0);
    expect(points(3, 8)).toBe(0);
  });
});
describe('original procedural question families', () => {
  test('all four pattern rules and unambiguous answer options', () => {
    const expected = [[2, 4, 6, 8, 10], [2, 4, 8, 16, 32], [2, 4, 7, 11, 16], [2, 4, 5, 7, 8]];
    for (let round = 0; round < 4; round++) {
      const question = pattern(round, () => 0);
      expect([...question.values, question.answer]).toEqual(expected[round]);
      expect(question.options[question.correct]).toBe(question.answer);
      expect(new Set(question.options).size).toBe(4);
    }
  });
  test('rotation preserves all 16 eight-square shape families and balanced decks', () => {
    expect(rotationShapes).toHaveLength(16);
    for (const [original, changed] of rotationShapes) {
      expect(original).toHaveLength(8); expect(changed).toHaveLength(8);
      expect(new Set(original.map(String)).size).toBe(8);
      expect(new Set(changed.map(String)).size).toBe(8);
    }
    const factory = createQuestionFactory('rotation', seeded(79));
    const questions = Array.from({ length: 48 }, (_, round) => factory(round) as RotationQuestion);
    for (let i = 0; i < 48; i += 16) expect(new Set(questions.slice(i, i + 16).map(q => q.shapeIndex)).size).toBe(16);
    for (let i = 0; i < 48; i += 12) for (let kind = 0; kind < 3; kind++) expect(questions.slice(i, i + 12).filter(q => q.correct === kind)).toHaveLength(4);
    for (let i = 1; i < questions.length; i++) expect(questions[i].shapeIndex).not.toBe(questions[i - 1].shapeIndex);
    const same = rotation(0, 0), mirrored = rotation(0, 1), changed = rotation(0, 2);
    expect(same.comparison).toBe(same.original);
    expect(mirrored.mirrored).toBe(true);
    expect(changed.comparison).toBe(rotationShapes[0][1]);
  });
  test('search has exactly one differently oriented arrow across all four orientations', () => {
    const random = seeded(14), directions = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const question = search(random), ordinary = question.angles[(question.correct + 1) % 16];
      directions.add(ordinary);
      expect(question.angles.filter(angle => angle !== ordinary)).toHaveLength(1);
      expect(question.angles[question.correct]).toBe(ordinary + 90);
    }
    expect(directions.size).toBe(4);
  });
  test('Stroop pairs are always incongruent and never repeat consecutively', () => {
    const random = seeded(32), pairs = new Set<number>();
    let previous = -1;
    for (let i = 0; i < 200; i++) {
      const question = stroop(previous, random);
      expect(question.printed).not.toBe(question.correct);
      expect(question.pair).not.toBe(previous);
      pairs.add(question.pair); previous = question.pair;
    }
    expect(pairs.size).toBe(12);
  });
  test('arithmetic keeps original operand ranges, all operators and negative results', () => {
    const random = seeded(45), operators = new Set<string>();
    let negative = false;
    for (let i = 0; i < 300; i++) {
      const q = arithmetic(random);
      expect(q.a).toBeGreaterThanOrEqual(2); expect(q.a).toBeLessThanOrEqual(19);
      expect(q.b).toBeGreaterThanOrEqual(2); expect(q.b).toBeLessThanOrEqual(13);
      expect(q.answer).toBe(q.operator === '+' ? q.a + q.b : q.operator === '−' ? q.a - q.b : q.a * q.b);
      operators.add(q.operator); negative ||= q.answer < 0;
    }
    expect(operators.size).toBe(3); expect(negative).toBe(true);
  });
});
