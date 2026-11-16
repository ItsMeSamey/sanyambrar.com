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
  const min = Math.min(lowest, Math.floor(lower / step) * step), max = Math.max(highest, Math.ceil(upper / step) * step);
  if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(step) || step <= 0) {
    return { min: lowest, max: highest, ticks: lowest === highest ? [lowest] : [lowest, highest] };
  }
  const intervals = Math.max(1, Math.round((max - min) / step));
  const ticks = [...new Set(Array.from({ length: intervals + 1 }, (_, index) => index === intervals ? max : Math.min(max, min + index * step)))];
  return { min, max, ticks };
}

export function chartPosition(value: number, scale: ChartScale, start: number, end: number) {
  if (scale.min === scale.max) return (start + end) / 2;
  const span = scale.max - scale.min;
  const fraction = Number.isFinite(span) ? (value - scale.min) / span : (value / 2 - scale.min / 2) / (scale.max / 2 - scale.min / 2);
  return start + fraction * (end - start);
}

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumSignificantDigits: 12 });
const decimal = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 12 });
export function chartLabel(value: number) {
  const magnitude = Math.abs(value);
  const scientific = () => {
    let [coefficient, exponent] = value.toExponential(2).split('e');
    if (!Number.isFinite(Number(`${coefficient}e${exponent}`))) {
      const exact = value.toExponential().split('e');
      coefficient = String(Math.trunc(Number(exact[0]) * 100) / 100);
      exponent = exact[1];
    }
    return `${Number(coefficient)}e${Number(exponent)}`;
  };
  // Compact notation stops abbreviating above trillions; significant digits alone
  // also leave hundreds of leading zeroes for subnormal imported scores.
  if (magnitude >= 1e9 || magnitude > 0 && magnitude < 0.001) return scientific();
  const label = magnitude >= 10000 ? compact.format(value) : decimal.format(value);
  return label.length > 8 ? scientific() : label;
}

/** Reserve room for bounded labels at the chart's native 11px text size. */
export function chartLabelWidth(scale: ChartScale, percent = false) {
  return Math.max(0, ...chartAxis(scale).labels.map(label => (label.length + Number(percent)) * 7));
}

export const chartGutter = (scale: ChartScale, percent = false) => Math.max(44, chartLabelWidth(scale, percent) + 16);

export function chartAxis(scale: ChartScale): { labels: string[]; offset?: number; multiplier?: number } {
  const labels = scale.ticks.map(chartLabel);
  if (new Set(labels).size === labels.length) return { labels };
  const offset = scale.ticks[0];
  const span = scale.ticks.at(-1)! - offset;
  const multiplier = 10 ** Math.floor(Math.log10(span)) || Number.MIN_VALUE;
  // Subtract before dividing so close, large values retain their differences.
  return { labels: scale.ticks.map(value => chartLabel((value - offset) / multiplier)), offset, multiplier };
}

export function chartAxisNote(scale: ChartScale) {
  const axis = chartAxis(scale);
  return axis.offset === undefined ? undefined : `${axis.offset} + tick${axis.multiplier === 1 ? '' : ` × ${axis.multiplier}`}`;
}

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
