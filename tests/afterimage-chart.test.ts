import { describe, expect, test } from 'bun:test';
import { chartLabel, chartPosition, chartScale } from '../src/games/afterimage/chart-model.ts';

const samples = [
  [7],
  [12, 12, 12],
  [0, 0, 0],
  [-9, -3, -6],
  [-4, 0, 11],
  [0.25, 0.5, 0.75],
  [5.6, 6.2, 7.4],
  [180, 250, 325],
];

describe('Afterimage chart geometry', () => {
  test('empty, single and constant histories retain a usable axis', () => {
    for (const values of [[], [7], [12, 12, 12], [0, 0, 0]]) {
      const scale = chartScale(values);
      expect(Number.isFinite(scale.min)).toBe(true);
      expect(Number.isFinite(scale.max)).toBe(true);
      expect(scale.max).toBeGreaterThan(scale.min);
      expect(scale.ticks.length).toBeGreaterThan(1);
      for (const value of values) {
        expect(chartPosition(value, scale, 176, 24)).toBeGreaterThanOrEqual(24);
        expect(chartPosition(value, scale, 176, 24)).toBeLessThanOrEqual(176);
      }
    }
  });

  test('rounded domains include every score and ordered ticks for negative and fractional runs', () => {
    for (const values of samples) {
      const scale = chartScale(values);
      expect(scale.min).toBeLessThanOrEqual(Math.min(...values));
      expect(scale.max).toBeGreaterThanOrEqual(Math.max(...values));
      expect(scale.ticks.every(Number.isFinite)).toBe(true);
      expect(new Set(scale.ticks).size).toBe(scale.ticks.length);
      for (let index = 1; index < scale.ticks.length; index++) {
        expect(scale.ticks[index]).toBeGreaterThan(scale.ticks[index - 1]);
      }
    }
  });

  test('distribution scales retain zero without clipping negative observations', () => {
    for (const values of [[2, 5, 8], [-8, -5, -2], [-3, 7]]) {
      const scale = chartScale(values, true);
      expect(scale.min).toBeLessThanOrEqual(Math.min(0, ...values));
      expect(scale.max).toBeGreaterThanOrEqual(Math.max(0, ...values));
    }
  });

  test('linear positions preserve order in horizontal and reversed vertical axes', () => {
    const scale = chartScale([-6, 0, 10]);
    expect(chartPosition(scale.min, scale, 48, 584)).toBeCloseTo(48);
    expect(chartPosition(scale.max, scale, 48, 584)).toBeCloseTo(584);
    expect(chartPosition(scale.min, scale, 176, 24)).toBeCloseTo(176);
    expect(chartPosition(scale.max, scale, 176, 24)).toBeCloseTo(24);
    expect(chartPosition(-6, scale, 48, 584)).toBeLessThan(chartPosition(0, scale, 48, 584));
    expect(chartPosition(0, scale, 176, 24)).toBeGreaterThan(chartPosition(10, scale, 176, 24));
    expect(chartPosition(12, { min: 12, max: 12, ticks: [12] }, 176, 24)).toBe(100);
  });

  test('finite extreme imports never produce invalid geometry', () => {
    for (const values of [
      [Number.MAX_VALUE],
      [-Number.MAX_VALUE, Number.MAX_VALUE],
      [Number.MAX_VALUE / 2, Number.MAX_VALUE],
      [0, Number.MIN_VALUE],
    ]) {
      const scale = chartScale(values);
      expect(Number.isFinite(scale.min)).toBe(true);
      expect(Number.isFinite(scale.max)).toBe(true);
      expect(scale.ticks.every(Number.isFinite)).toBe(true);
      for (const value of values) {
        const position = chartPosition(value, scale, 176, 24);
        expect(Number.isFinite(position)).toBe(true);
        expect(position).toBeGreaterThanOrEqual(24);
        expect(position).toBeLessThanOrEqual(176);
      }
    }
  });

  test('axis labels distinguish the ticks of ordinary score ranges', () => {
    for (const values of [...samples, [10000, 10020], [0.001, 0.002]]) {
      const labels = chartScale(values).ticks.map(chartLabel);
      expect(new Set(labels).size).toBe(labels.length);
      expect(labels.every(label => label.length > 0)).toBe(true);
    }
  });
});
