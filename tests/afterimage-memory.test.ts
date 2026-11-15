import { describe, expect, test } from 'bun:test';
import { nextSequence, sequenceRules, shuffledRange, visualRound } from '../src/games/afterimage/memory-model';

describe('Afterimage memory protocols', () => {
  test('pattern levels have enough unique targets and preserve benchmark board sizes', () => {
    for (let level = 1; level <= 100; level++) {
      const { size, targets } = visualRound(level, () => 0.25);
      expect(size).toBe(Math.floor(Math.sqrt(9 + level * 3)));
      expect(targets.length).toBe(level + 2);
      expect(new Set(targets).size).toBe(level + 2);
      expect(targets.every(value => value >= 0 && value < size * size)).toBe(true);
    }
    expect(visualRound(1).size).toBe(3);
    expect(visualRound(3).size).toBe(4);
  });

  test('growing standard sequences keep their prefix and never repeat adjacent tiles', () => {
    let sequence: number[] = [];
    for (let level = 1; level <= 50; level++) {
      const previous = [...sequence];
      sequence = nextSequence('sequence', previous, level, () => 0);
      expect(sequence.slice(0, -1)).toEqual(previous);
      expect(sequence).toHaveLength(level);
      if (level > 1) expect(sequence.at(-1)).not.toBe(sequence.at(-2));
    }
  });

  test('fresh modes replace the entire sequence and reverse growing allows repetitions', () => {
    expect(nextSequence('sequence-fresh', [8, 7], 3, () => 0)).toEqual([0, 0, 0]);
    expect(nextSequence('reverse-fresh', [8, 7], 3, () => 0)).toEqual([0, 0, 0]);
    expect(nextSequence('reverse', [0], 2, () => 0)).toEqual([0, 0]);
  });

  test('only standard sequence records reached level and uses uninterrupted half-second prompts', () => {
    const standard = sequenceRules('sequence');
    expect([standard.scope, standard.score(1), standard.lead, standard.spacing, standard.duration])
      .toEqual(['sequence-v3-growing', 1, 1000, 500, 500]);
    for (const id of ['sequence-fresh', 'reverse', 'reverse-fresh'] as const) {
      const rules = sequenceRules(id);
      expect([rules.score(1), rules.lead, rules.spacing, rules.duration]).toEqual([0, 350, 650, 450]);
    }
    expect(sequenceRules('sequence-fresh').scope).toBe('sequence-v2-fresh');
    expect(sequenceRules('reverse').scope).toBe('reverse-v2-growing');
    expect(sequenceRules('reverse-fresh').scope).toBe('reverse-v2-fresh');
  });

  test('number order and chimp shuffles contain each board position once', () => {
    for (const length of [25, 40]) {
      const positions = shuffledRange(length, () => 0.5);
      expect([...positions].sort((a, b) => a - b)).toEqual(Array.from({ length }, (_, i) => i));
    }
  });
});
