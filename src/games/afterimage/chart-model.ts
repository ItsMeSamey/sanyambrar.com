export type ChartScale = { min: number; max: number; ticks: number[] };

/** Rounded axes retain the measured range, including constant and negative histories. */
export function chartScale(values: readonly number[], fromZero = false): ChartScale {
  if (!values.length) return { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] };
  const lowest = Math.min(...values), highest = Math.max(...values);
  const padding = lowest === highest ? Math.max(Math.abs(lowest) * 0.1, 1) : (highest - lowest) * 0.08;
  const lower = fromZero ? Math.min(0, lowest) : lowest >= 0 ? Math.max(0, lowest - padding) : lowest - padding;
  const upper = fromZero ? Math.max(0, highest + padding) : highest + padding;
  const magnitude = 10 ** Math.floor(Math.log10((upper - lower) / 4));
  const step = ([1, 2, 2.5, 5, 10].find(value => value * magnitude >= (upper - lower) / 4) ?? 10) * magnitude;
  const min = Math.floor(lower / step) * step, max = Math.ceil(upper / step) * step;
  if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(step) || step <= 0) {
    return { min: lowest, max: highest, ticks: lowest === highest ? [lowest] : [lowest, highest] };
  }
  return { min, max, ticks: Array.from({ length: Math.round((max - min) / step) + 1 }, (_, index) => Number((min + index * step).toPrecision(12))) };
}

export function chartPosition(value: number, scale: ChartScale, start: number, end: number) {
  if (scale.min === scale.max) return (start + end) / 2;
  const span = scale.max - scale.min;
  const fraction = Number.isFinite(span) ? (value - scale.min) / span : (value / 2 - scale.min / 2) / (scale.max / 2 - scale.min / 2);
  return start + fraction * (end - start);
}

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumSignificantDigits: 12 });
const decimal = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 12 });
export const chartLabel = (value: number) => Math.abs(value) >= 10000 ? compact.format(value) : decimal.format(value);

export function nearestChartIndex(position: number, start: number, end: number, count: number) {
  if (count <= 0) return null;
  if (count === 1 || end <= start) return 0;
  return Math.max(0, Math.min(count - 1, Math.round((position - start) / (end - start) * (count - 1))));
}

export function scoreAxisLabel(unit: string) {
  if (unit === 'ms') return 'Time (milliseconds)';
  if (unit === 's') return 'Time (seconds)';
  if (unit === 'WPM') return 'Words per minute';
  if (unit === 'clicks/s') return 'Clicks per second';
  if (unit === 'taps/s') return 'Taps per second';
  return `Score (${unit})`;
}
