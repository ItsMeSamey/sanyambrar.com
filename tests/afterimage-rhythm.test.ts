import { describe, expect, test } from 'bun:test';
import { judgeRhythm, rhythmResponseDeadline, rhythmTolerance } from '../src/games/afterimage/rhythm-model.ts';

describe('rhythm timing', () => {
  const target = [0, 500, 750, 1500];
  test('anchors the first tap and ignores absolute listening / response latency', () => {
    for (const latency of [0, 100, 4500, 100000]) {
      const result = judgeRhythm(target, target.map(time => time + latency), 500);
      expect(result.passed).toBe(true);
      expect(result.errors).toEqual([0, 0, 0]);
    }
  });
  test('judges timing relative to the first tap, rather than forgiving cumulative drift', () => {
    const result = judgeRhythm(target, [1000, 1550, 1850, 2650], 500);
    expect(result.passed).toBe(false);
    expect(result.errors).toEqual([50, 100, 150]);
    expect(result.meanErrorMs).toBe(100);
    expect(result.matched).toBe(1);
  });
  test('tolerance boundaries are inclusive and bounded across tempo', () => {
    expect(rhythmTolerance(200)).toBe(90);
    expect(rhythmTolerance(1000)).toBe(150);
    expect(judgeRhythm([0, 500], [100, 690], 500).passed).toBe(true);
    expect(judgeRhythm([0, 500], [100, 691], 500).passed).toBe(false);
  });
  test('rejects missing, empty, and extra responses independently of good timing', () => {
    const missing = judgeRhythm(target, [1000, 1500], 500);
    expect(missing.passed).toBe(false);
    expect(missing.missing).toBe(2);
    expect(missing.total).toBe(3);
    const extra = judgeRhythm(target, [1000, 1500, 1750, 2500, 2600], 500);
    expect(extra.extra).toBe(1);
    expect(extra.passed).toBe(false);
    expect(extra.total).toBe(4);
    expect(judgeRhythm(target, [], 500).missing).toBe(4);
    expect(judgeRhythm([], [], 500).passed).toBe(false);
  });
  test('a skipped middle note cannot silently slide into a passing alignment', () => {
    const result = judgeRhythm(target, [5000, 5750, 6500], 500);
    expect(result.passed).toBe(false);
    expect(result.missing).toBe(1);
    expect(result.errors).toEqual([250, 750]);
  });
  test('deadline includes the final-note tolerance and a bounded extra-tap tail', () => {
    expect(rhythmResponseDeadline(target, 500, 1000)).toBe(2890);
    expect(rhythmResponseDeadline([200, 700], 500, 1000)).toBe(1890);
  });
});
