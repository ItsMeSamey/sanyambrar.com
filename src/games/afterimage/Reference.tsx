import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import type { GameId } from './types.ts';
import { referenceFor, summarizeBins, type HistogramReference } from './reference-model.ts';
import { ChartGrid, useChartWidth } from './Chart.tsx';
import { chartLabel, chartPosition, chartScale } from './chart-model.ts';

function Histogram(props: { reference: HistogramReference; value?: number }) {
  const summary = createMemo(() => summarizeBins(props.reference.bins)!);
  const geometry = useChartWidth();
  const [lastValue, setLastValue] = createSignal(0);
  // Retain the legend's exact width when cleared, including its narrow-screen wrap.
  createEffect(() => props.value, value => { if (value !== undefined) setLastValue(value); });
  const domain = createMemo(() => {
    const bins = props.reference.bins;
    const step = bins.length > 1 ? bins[1].id - bins[0].id : 1;
    return { min: Math.min(bins[0].id, props.value ?? Infinity) - step / 2, max: Math.max(bins.at(-1)!.id, props.value ?? -Infinity) + step / 2, ticks: [], step };
  });
  const scale = createMemo(() => chartScale([summary().maxCount / summary().total * 100], true));
  const x = (value: number) => chartPosition(value, domain(), 44, geometry.width() - 16);
  const y = (count: number) => chartPosition(count / summary().total * 100, scale(), 176, 24);
  const barWidth = () => (geometry.width() - 60) / (domain().max - domain().min) * domain().step;
  return <>
    <div class="ai-reference-metrics"><span class="ai-chart-legend">Mean ≈ <strong>{summary().mean.toFixed(1)}</strong> {props.reference.unit}</span><span>Median bin <strong>{summary().median}</strong></span><span class="ai-chart-selected-legend" aria-hidden={props.value === undefined ? 'true' : undefined}>Selected <strong>{chartLabel(props.value ?? lastValue())}</strong> {props.reference.unit}</span></div>
    <svg ref={geometry.ref} class="ai-reference-chart" viewBox={`0 0 ${geometry.width()} 210`} role="img" aria-label={`Human Benchmark binned score distribution. Vertical axis: percentage of observations. Estimated mean ${summary().mean.toFixed(1)} ${props.reference.unit}. ${summary().total} published observations.${props.value !== undefined ? ` Selected run: ${props.value} ${props.reference.unit}.` : ''}`}>
      <ChartGrid scale={scale()} width={geometry.width()} top={24} bottom={176} percent/>
      <For each={props.reference.bins}>{bin => <rect class="ai-chart-bar" x={x(bin.id) - barWidth() / 2 + .5} y={y(bin.count)} width={Math.max(0.5, barWidth() - 1)} height={176 - y(bin.count)} rx="1"><title>Bin {bin.id}: {bin.count} observations ({(100 * bin.count / summary().total).toFixed(2)}%)</title></rect>}</For>
      <path class="ai-chart-average" d={`M${x(summary().mean)} 16V176`}><title>Estimated mean {summary().mean.toFixed(1)} {props.reference.unit}</title></path>
      <Show when={props.value !== undefined}><g class="ai-chart-selection"><path d={`M${x(props.value!)} 24V176`}/><path class="ai-chart-selected-mark" d={`M${x(props.value!) - 5} 14h10l-5 7Z`}/></g></Show>
      <text x={x(domain().min + domain().step / 2)} y="200">{chartLabel(domain().min + domain().step / 2)}</text>
      <text x={x(domain().max - domain().step / 2)} y="200" text-anchor="end">{chartLabel(domain().max - domain().step / 2)} {props.reference.unit}</text>
    </svg>
    <p class="ai-reference-source"><a href={props.reference.source} target="_blank" rel="noopener noreferrer">Human Benchmark</a><span>{summary().total.toLocaleString()} observations · 11 Nov 2026</span></p>
  </>;
}

function MeanChart(props: { mean: number; value?: number }) {
  const geometry = useChartWidth();
  const scale = createMemo(() => chartScale([0, Math.max(10, props.value ?? 0)]));
  const x = (value: number) => chartPosition(value, scale(), 24, geometry.width() - 24);
  return <svg ref={geometry.ref} class="ai-reference-chart ai-mean-chart" viewBox={`0 0 ${geometry.width()} 100`} role="img" aria-label={`CPS Test published mean: ${props.mean} inputs per second over 10 seconds. Mixed input devices; mean marker only, not a distribution.${props.value !== undefined ? ` Selected run: ${props.value} per second.` : ''}`}>
    <path class="ai-chart-axis" d={`M24 60H${geometry.width() - 24}`}/>
    <For each={scale().ticks}>{value => <g><path class="ai-chart-axis" d={`M${x(value)} 56V64`}/><text x={x(value)} y="83" text-anchor="middle">{chartLabel(value)}</text></g>}</For>
    <path class="ai-chart-average" d={`M${x(props.mean)} 29V64`}/><circle class="ai-chart-point" cx={x(props.mean)} cy="60" r="4"/>
    <text x={x(props.mean)} y="20" text-anchor="middle">Mean {props.mean}</text>
    <Show when={props.value !== undefined}><g class="ai-chart-selection"><circle cx={x(props.value!)} cy="60" r="6"/><title>Selected run: {props.value} per second</title></g></Show>
  </svg>;
}

export function Reference(props: { id: GameId; scope: string; value?: number; boardFormat?: 'standard' | 'compact' }) {
  const reference = createMemo(() => referenceFor(props.id, props.scope, props.boardFormat));
  const histogram = createMemo(() => { const ref = reference(); return ref?.kind === 'histogram' ? ref : null; });
  const mean = createMemo(() => { const ref = reference(); return ref?.kind === 'mean' ? ref : null; });
  return <Show when={reference()}><section class="ai-reference" aria-label="External reference"><details open><summary>{mean() ? 'External mean · mixed inputs' : 'Human Benchmark reference'}</summary>
    <Show when={histogram()}>{ref => <Histogram reference={ref()} value={props.value}/>}</Show>
    <Show when={mean()}>{ref => <>
      <p>10 seconds · inputs per second. Sample size unpublished.</p>
      <MeanChart mean={ref().mean} value={props.value}/>
      <p class="ai-reference-source"><a href={ref().source} target="_blank" rel="noopener noreferrer">CPS Test / arealme</a><span>Retrieved 11 Nov 2026</span></p>
    </>}</Show>
  </details></section></Show>;
}
