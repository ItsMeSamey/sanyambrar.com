import { describe, expect, test } from 'bun:test';
import { createDeductionQuestion, deductionClaimLabel, type DeductionClaim, type DeductionQuestion } from '../src/games/afterimage/deduction-core.ts';

function seeded(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function permutations(tiles: readonly string[]): string[][] {
  if (!tiles.length) return [[]];
  return tiles.flatMap(tile => permutations(tiles.filter(other => other !== tile)).map(rest => [tile, ...rest]));
}
function worlds(question: DeductionQuestion) {
  return permutations(question.tiles).filter(order => question.premises.every(rule => order.indexOf(rule.before) < order.indexOf(rule.after)));
}
function holds(order: string[], claim: DeductionClaim) {
  return claim.kind === 'before' ? order.indexOf(claim.before) < order.indexOf(claim.after) : order[claim.position] === claim.tile;
}
function verify(question: DeductionQuestion) {
  const models = worlds(question);
  expect(models.length).toBeGreaterThan(0);
  expect(question.claims).toHaveLength(4);
  expect(question.options).toHaveLength(4);
  expect(new Set(question.options).size).toBe(4);
  expect(question.options).toEqual(question.claims.map(deductionClaimLabel));
  expect(question.correct).toBeGreaterThanOrEqual(0);
  expect(question.correct).toBeLessThan(4);
  const necessary = question.claims.flatMap((claim, index) => models.every(order => holds(order, claim)) ? [index] : []);
  expect(necessary).toEqual([question.correct]);
  for (const premise of question.premises) {
    expect(question.tiles).toContain(premise.before);
    expect(question.tiles).toContain(premise.after);
    expect(premise.before).not.toBe(premise.after);
  }
  const answer = question.claims[question.correct];
  if (answer.kind === 'before') {
    expect(question.premises.some(rule => rule.before === answer.before && rule.after === answer.after)).toBe(false);
    const proof = question.explanation.slice(0, -1).split(' before ');
    expect(proof[0]).toBe(answer.before);
    expect(proof.at(-1)).toBe(answer.after);
    expect(proof.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < proof.length; i++) {
      expect(question.premises.some(rule => rule.before === proof[i - 1] && rule.after === proof[i])).toBe(true);
    }
  } else {
    const match = /^(\d) tiles? must come before ([A-E]); (\d) after\.$/.exec(question.explanation);
    expect(match).not.toBeNull();
    expect(match![2]).toBe(answer.tile);
    expect(Number(match![1])).toBe(answer.position);
    expect(Number(match![3])).toBe(question.tiles.length - 1 - answer.position);
  }
  return models;
}

describe('Deduction finite-model oracle', () => {
  test('thousands of generated puzzles each have exactly one necessary choice across all valid orders', () => {
    const answerSlots = new Set<number>(), modes = new Set<string>(), shapes = new Set<string>();
    let ambiguousPremises = 0, uncertainDistractors = 0;
    for (let seed = 1; seed <= 48; seed++) {
      const random = seeded(seed * 7919);
      for (let round = 0; round < 60; round++) {
        const question = createDeductionQuestion(round, random), models = verify(question);
        answerSlots.add(question.correct); modes.add(question.kind);
        shapes.add(`${question.tiles.length}:${models.length}:${question.premises.length}`);
        if (models.length > 1) ambiguousPremises++;
        if (question.claims.some(claim => models.some(order => holds(order, claim)) && !models.every(order => holds(order, claim)))) uncertainDistractors++;
      }
    }
    expect([...answerSlots].sort()).toEqual([0, 1, 2, 3]);
    expect([...modes].sort()).toEqual(['positions', 'relations']);
    expect(shapes.size).toBeGreaterThanOrEqual(7);
    expect(ambiguousPremises).toBeGreaterThan(1000);
    expect(uncertainDistractors).toBe(ambiguousPremises);
  });

  test('progression grows the tile set and adds rank reasoning without exceeding the four-rule panel', () => {
    const random = seeded(44);
    for (const round of [0, 1, 2, 3, 4, 5, 7, 8, 9, 20, 100, 10000]) {
      const question = createDeductionQuestion(round, random);
      expect(question.tiles.length).toBe(round < 3 ? 3 : round < 8 ? 4 : 5);
      expect(question.premises.length).toBeLessThanOrEqual(4);
      expect(question.premises.length).toBeGreaterThanOrEqual(2);
      expect(question.kind).toBe(round >= 3 && round % 3 === 2 ? 'positions' : 'relations');
      expect(new Set(question.premises.flatMap(rule => [rule.before, rule.after])).size).toBe(question.tiles.length);
      verify(question);
    }
  });

  test('random endpoint streams terminate with valid nonrepeating options', () => {
    for (const value of [0, .499999, .999999999]) for (let round = 0; round < 24; round++) {
      verify(createDeductionQuestion(round, () => value));
    }
  });

  test('all displayed arrows preserve their actual direction and both orientations occur', () => {
    const random = seeded(99), orientations = new Set<boolean>();
    for (let round = 0; round < 80; round++) {
      const question = createDeductionQuestion(round, random);
      question.premises.forEach(rule => orientations.add(rule.reverse));
      expect(question.options.every(label => /^[A-E] (before [A-E]|is [1-5](st|nd|rd|th))$/.test(label))).toBe(true);
    }
    expect(orientations.size).toBe(2);
  });
});
