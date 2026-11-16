import { describe, expect, test } from 'bun:test';
import { chartAxis, chartAxisNote, chartGutter, chartLabel, chartLabelWidth, chartPosition, chartScale, nearestChartIndex, scoreAxisLabel } from '../src/games/afterimage/chart-model.ts';

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
  test('plot inspection clamps to actual runs and handles empty or single-point histories', () => {
    expect(nearestChartIndex(120, 44, 284, 0)).toBeNull();
    expect(nearestChartIndex(120, 44, 284, 1)).toBe(0);
    expect(nearestChartIndex(-100, 44, 284, 5)).toBe(0);
    expect(nearestChartIndex(400, 44, 284, 5)).toBe(4);
    expect(nearestChartIndex(160, 44, 284, 5)).toBe(2);
    expect(nearestChartIndex(120, 44, 44, 5)).toBe(0);
  });

  test('axis labels name score quantities and expand abbreviated units', () => {
    expect(scoreAxisLabel('ms')).toBe('Time (milliseconds)');
    expect(scoreAxisLabel('s')).toBe('Time (seconds)');
    expect(scoreAxisLabel('WPM')).toBe('Words per minute');
    expect(scoreAxisLabel('clicks/s')).toBe('Clicks per second');
    expect(scoreAxisLabel('taps/s')).toBe('Taps per second');
    expect(scoreAxisLabel('levels')).toBe('Score (levels)');
  });
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

  test('extreme imported scores have bounded scientific labels with their sign and magnitude intact', () => {
    for (const value of [1e100, -1e100, 1e-100, -1e-100, Number.MAX_VALUE, -Number.MAX_VALUE, Number.MIN_VALUE, -Number.MIN_VALUE, 1.23456789e-250, -1.23456789e250]) {
      const label = chartLabel(value);
      expect(label.length).toBeLessThanOrEqual(10);
      expect(label).toMatch(/^-?[1-9](?:\.\d{1,2})?e-?\d{1,3}$/);
      const approximate = Number(label);
      expect(Number.isFinite(approximate)).toBe(true);
      expect(Math.sign(approximate)).toBe(Math.sign(value));
      expect(Math.abs((approximate - value) / value)).toBeLessThan(0.005);
    }
  });

  test('format boundaries and tiny fractions never expand into unbounded digit strings', () => {
    for (const value of [0, -0, 0.00099999, 0.001, 0.00100001, 9999.9999, 10000, 10000.0001, 999999999, 1e9, 1e9 + 1]) {
      for (const signed of [value, -value]) {
        const label = chartLabel(signed);
        expect(label.length).toBeLessThanOrEqual(10);
        expect(label).not.toMatch(/NaN|Infinity/);
        if (signed > 0) expect(label).not.toBe('0');
        if (signed < 0) expect(label.startsWith('-')).toBe(true);
      }
    }
  });

  test('bounded tick gutters retain a usable 280px plot across extreme positive, negative and tiny scales', () => {
    for (const values of [
      [1e100, 2e100], [-2e100, -1e100], [-1e100, 1e100],
      [1e-100, 2e-100], [-2e-100, -1e-100], [-1e-100, 1e-100],
      [0, Number.MIN_VALUE], [-Number.MAX_VALUE, Number.MAX_VALUE], [10000, 10020],
    ]) {
      const scale = chartScale(values);
      const left = chartGutter(scale);
      expect(chartLabelWidth(scale)).toBeLessThanOrEqual(70);
      expect(left - 9 - chartLabelWidth(scale)).toBeGreaterThanOrEqual(7);
      expect(256 - left - 16).toBeGreaterThanOrEqual(154);
      for (const value of values) {
        const x = chartPosition(value, scale, left, 240);
        expect(Number.isFinite(x)).toBe(true);
        expect(x).toBeGreaterThanOrEqual(left);
        expect(x).toBeLessThanOrEqual(240);
      }
    }
    expect(chartGutter(chartScale([5, 15]))).toBe(44);
  });

  test('close large, tiny and negative runs retain distinct grid and mean-axis labels', () => {
    for (const values of [
      [1e9, 1e9 + 1], [-1e9 - 1, -1e9],
      [1e100, 1e100 * (1 + 1e-10)], [-1e100 * (1 + 1e-10), -1e100],
      [1e-100, 1e-100 * (1 + 1e-10)], [-1e-100 * (1 + 1e-10), -1e-100],
      [1e100, 1e100 * (1 + Number.EPSILON)],
      [1e-100, 1e-100 * (1 + Number.EPSILON)],
      [1.23456e-297, 1.23456e-297 * (1 + Number.EPSILON)],
      [-1.23456e-293, -1.23456e-293 * (1 + Number.EPSILON)],
    ]) {
      const scale = chartScale(values);
      const axis = chartAxis(scale);
      expect(scale.ticks.length).toBeGreaterThan(1);
      expect(scale.min).toBeLessThanOrEqual(Math.min(...values));
      expect(scale.max).toBeGreaterThanOrEqual(Math.max(...values));
      expect(new Set(scale.ticks).size).toBe(scale.ticks.length);
      expect(new Set(axis.labels).size).toBe(scale.ticks.length);
      expect(axis.labels.every(label => label.length <= 10)).toBe(true);
      expect(axis.offset).toBe(scale.ticks[0]);
      expect(chartAxisNote(scale)).toContain(String(axis.offset));
      expect(chartGutter(scale)).toBeLessThanOrEqual(86);
      expect(axis.multiplier).toBeGreaterThan(0);
      expect(Number.isFinite(axis.multiplier)).toBe(true);
      const spacing = Math.min(...scale.ticks.slice(1).map((tick, index) => tick - scale.ticks[index]));
      for (let index = 0; index < scale.ticks.length; index++) {
        const reconstructed = axis.offset! + Number(axis.labels[index]) * axis.multiplier!;
        expect(Math.abs(reconstructed - scale.ticks[index])).toBeLessThan(spacing / 2);
      }
    }
  });

  test('ordinary axes and zero-based mean comparisons keep their existing notation', () => {
    for (const values of [...samples, [0, 6.66, 12], [0, 6.66, 1e100], [-1e100, 0, 6.66]]) {
      const scale = chartScale(values);
      expect(chartAxis(scale).labels).toEqual(scale.ticks.map(chartLabel));
      expect(chartAxisNote(scale)).toBeUndefined();
    }
  });

  test('narrow finite ranges across decimal exponents neither clip runs nor invent indistinguishable endpoint ticks', () => {
    for (let exponent = -323; exponent <= 308; exponent++) {
      for (const sign of [-1, 1]) for (const delta of [Number.EPSILON, 1e-10, 1e-6]) {
        const first = sign * 1.23456 * 10 ** exponent, second = first * (1 + delta);
        if (!Number.isFinite(first) || !Number.isFinite(second) || first === second) continue;
        const scale = chartScale([first, second]), labels = chartAxis(scale).labels;
        expect(scale.min).toBeLessThanOrEqual(Math.min(first, second));
        expect(scale.max).toBeGreaterThanOrEqual(Math.max(first, second));
        expect(labels.length).toBeGreaterThan(1);
        expect(new Set(labels).size).toBe(labels.length);
        expect(labels.every(label => label.length <= 10)).toBe(true);
      }
    }
  });
});
