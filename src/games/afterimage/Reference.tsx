import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import type { GameId } from './types.ts';
import { referenceFor, summarizeBins, type HistogramReference } from './reference-model.ts';
import { ChartAxes, ChartDetail, ChartGrid, ChartScaleNote, useChartWidth } from './Chart.tsx';
import { chartAxis, chartGutter, chartLabel, chartLabelWidth, chartPosition, chartScale, nearestChartIndex, scoreAxisLabel } from './chart-model.ts';

function Histogram(props: { reference: HistogramReference; value?: number }) {
  let chart: SVGSVGElement | undefined;
  const summary = createMemo(() => summarizeBins(props.reference.bins)!);
  const geometry = useChartWidth();
  const [chosen, setChosen] = createSignal<number | null>(null);
  const [hovered, setHovered] = createSignal<number | null>(null);
  const inspected = () => hovered() ?? chosen();
  const inspectedBin = () => inspected() === null ? undefined : props.reference.bins[inspected()!];
  const choose = (index: number) => { setHovered(null); setChosen(index); };
  const close = () => { setHovered(null); setChosen(null); chart?.focus({ preventScroll: true }); };
  const [lastValue, setLastValue] = createSignal(0);
  // Retain the legend's exact width when cleared, including its narrow-screen wrap.
  createEffect(() => props.value, value => { if (value !== undefined) setLastValue(value); });
  const domain = createMemo(() => {
    const bins = props.reference.bins;
    const step = bins.length > 1 ? bins[1].id - bins[0].id : 1;
    return { min: Math.min(bins[0].id, props.value ?? Infinity) - step / 2, max: Math.max(bins.at(-1)!.id, props.value ?? -Infinity) + step / 2, ticks: [], step };
  });
  const scale = createMemo(() => chartScale([summary().maxCount / summary().total * 100], true));
  const left = () => chartGutter(scale(), true);
  const x = (value: number) => chartPosition(value, domain(), left(), geometry.width() - 16);
  const y = (count: number) => chartPosition(count / summary().total * 100, scale(), 176, 24);
  const barWidth = () => (geometry.width() - left() - 16) / (domain().max - domain().min) * domain().step;
  const pointAt = (event: MouseEvent) => {
    const bounds = event.currentTarget instanceof SVGSVGElement ? event.currentTarget.getBoundingClientRect() : null;
    if (!bounds?.width || event.clientY < bounds.top + 24 || event.clientY > bounds.top + 176) return null;
    return nearestChartIndex((event.clientX - bounds.left) / bounds.width * geometry.width(), x(props.reference.bins[0].id), x(props.reference.bins.at(-1)!.id), props.reference.bins.length);
  };
  const keys = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', ' ', 'Escape'].includes(event.key)) return;
    event.preventDefault(); setHovered(null);
    const last = props.reference.bins.length - 1;
    if (event.key === 'Escape') setChosen(null);
    else if (event.key === 'Home') setChosen(0);
    else if (event.key === 'End') setChosen(last);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') setChosen(Math.max(0, (chosen() ?? last + 1) - 1));
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') setChosen(Math.min(last, (chosen() ?? -1) + 1));
    else setChosen(Math.floor(last / 2));
  };
  return <>
    <div class="ai-reference-metrics"><span class="ai-chart-legend">Mean ≈ <strong>{summary().mean.toFixed(1)}</strong> {props.reference.unit}</span><span>Median bin <strong>{summary().median}</strong></span><span class="ai-chart-selected-legend" aria-hidden={props.value === undefined ? 'true' : undefined}>Selected <strong>{chartLabel(props.value ?? lastValue())}</strong> {props.reference.unit}</span></div>
    <svg ref={element => { chart = element; geometry.ref(element); }} class="ai-reference-chart" viewBox={`0 0 ${geometry.width()} 236`} role="group" tabindex="0" aria-label={`Human Benchmark score distribution. Horizontal axis: ${scoreAxisLabel(props.reference.unit)}. Vertical axis: percentage of observations. Use arrow keys, Home and End to inspect bins; Escape closes details. Estimated mean ${summary().mean.toFixed(1)} ${props.reference.unit}. ${summary().total} published observations.${props.value !== undefined ? ` Selected run: ${props.value} ${props.reference.unit}.` : ''}`} onKeyDown={keys} onPointerMove={event => { if (event.pointerType !== 'touch') setHovered(pointAt(event)); }} onPointerLeave={() => setHovered(null)} onClick={event => { setChosen(pointAt(event)); setHovered(null); event.currentTarget.focus({ preventScroll: true }); }}>
      <ChartAxes width={geometry.width()} left={left()} horizontal={scoreAxisLabel(props.reference.unit)} vertical="Observations (%)"/>
      <ChartGrid scale={scale()} width={geometry.width()} top={24} bottom={176} percent/>
      <For each={props.reference.bins}>{bin => <rect class="ai-chart-bar" x={x(bin.id) - barWidth() / 2 + .5} y={y(bin.count)} width={Math.max(0.5, barWidth() - 1)} height={176 - y(bin.count)} rx="1"><title>{bin.id} {props.reference.unit}: {bin.count} observations ({(100 * bin.count / summary().total).toFixed(2)}%)</title></rect>}</For>
      <path class="ai-chart-average" d={`M${x(summary().mean)} 24V176`}><title>Estimated mean {summary().mean.toFixed(1)} {props.reference.unit}</title></path>
      <Show when={props.value !== undefined}><g class="ai-chart-selection"><path d={`M${x(props.value!)} 24V176`}/><path class="ai-chart-selected-mark" d={`M${x(props.value!) - 5} 14h10l-5 7Z`}/></g></Show>
      <Show when={inspectedBin()}>{bin => <g class="ai-chart-selection"><path d={`M${x(bin().id)} 24V176`}/><circle cx={x(bin().id)} cy={y(bin().count)} r="5"/></g>}</Show>
      <text x={x(domain().min + domain().step / 2)} y="200">{chartLabel(domain().min + domain().step / 2)}</text>
      <text x={x(domain().max - domain().step / 2)} y="200" text-anchor="end">{chartLabel(domain().max - domain().step / 2)} {props.reference.unit}</text>
    </svg>
    <ChartScaleNote scale={scale()} unit="%"/>
    <div class="ai-chart-detail-slot"><Show when={inspectedBin()}>{bin => <ChartDetail previous={inspected()! > 0 ? () => choose(inspected()! - 1) : undefined} next={inspected()! < props.reference.bins.length - 1 ? () => choose(inspected()! + 1) : undefined} close={close}><strong>{chartLabel(bin().id)} {props.reference.unit}</strong><br/>{(100 * bin().count / summary().total).toFixed(2)}% · {bin().count.toLocaleString()} observations</ChartDetail>}</Show></div>
    <p class="ai-reference-source"><a href={props.reference.source} target="_blank" rel="noopener noreferrer">Human Benchmark</a><span>{summary().total.toLocaleString()} observations · 11 Nov 2026</span></p>
  </>;
}

function MeanChart(props: { mean: number; value?: number }) {
  let chart: SVGSVGElement | undefined;
  const geometry = useChartWidth();
  const [chosen, setChosen] = createSignal<number | null>(null);
  const [hovered, setHovered] = createSignal<number | null>(null);
  const markers = () => [{ label: 'Published mean', value: props.mean }, ...(props.value === undefined ? [] : [{ label: 'Selected run', value: props.value }])];
  const inspected = () => markers()[hovered() ?? chosen() ?? -1];
  const choose = (index: number) => { setHovered(null); setChosen(index); };
  const close = () => { setHovered(null); setChosen(null); chart?.focus({ preventScroll: true }); };
  const scale = createMemo(() => chartScale([0, props.mean, props.value ?? 0], true));
  const inset = () => Math.max(24, chartLabelWidth(scale()) / 2 + 8);
  const crowdedTicks = () => (chartLabelWidth(scale()) + 8) * (scale().ticks.length - 1) > geometry.width() - inset() * 2;
  const x = (value: number) => chartPosition(value, scale(), inset(), geometry.width() - inset());
  const pointAt = (event: MouseEvent) => {
    const bounds = event.currentTarget instanceof SVGSVGElement ? event.currentTarget.getBoundingClientRect() : null;
    if (!bounds?.width || event.clientY < bounds.top + 24 || event.clientY > bounds.top + 74) return null;
    const position = (event.clientX - bounds.left) / bounds.width * geometry.width();
    return markers().reduce((nearest, marker, index, values) => Math.abs(x(marker.value) - position) < Math.abs(x(values[nearest].value) - position) ? index : nearest, 0);
  };
  const keys = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', ' ', 'Escape'].includes(event.key)) return;
    event.preventDefault(); setHovered(null);
    const last = markers().length - 1;
    if (event.key === 'Escape') setChosen(null);
    else if (event.key === 'Home') setChosen(0);
    else if (event.key === 'End') setChosen(last);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') setChosen(Math.max(0, (chosen() ?? last + 1) - 1));
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') setChosen(Math.min(last, (chosen() ?? -1) + 1));
    else setChosen(0);
  };
  return <><svg ref={element => { chart = element; geometry.ref(element); }} class="ai-reference-chart ai-mean-chart" viewBox={`0 0 ${geometry.width()} 130`} role="group" tabindex="0" aria-label={`CPS Test published mean: ${props.mean} inputs per second over 10 seconds. Horizontal axis: inputs per second. Mixed input devices; mean marker only, not a distribution. Use arrow keys to inspect markers; Escape closes details.${props.value !== undefined ? ` Selected run: ${props.value} per second.` : ''}`} onKeyDown={keys} onPointerMove={event => { if (event.pointerType !== 'touch') setHovered(pointAt(event)); }} onPointerLeave={() => setHovered(null)} onClick={event => { setChosen(pointAt(event)); setHovered(null); event.currentTarget.focus({ preventScroll: true }); }}>
    <path class="ai-chart-axis" d={`M${inset()} 60H${geometry.width() - inset()}`}/>
    <For each={scale().ticks}>{(value, index) => <g><path class="ai-chart-axis" d={`M${x(value)} 56V64`}/><Show when={!crowdedTicks() || index() === 0 || index() === scale().ticks.length - 1}><text x={x(value)} y="83" text-anchor="middle">{chartAxis(scale()).labels[index()]}</text></Show></g>}</For>
    <path class="ai-chart-average" d={`M${x(props.mean)} 29V64`}/><circle class="ai-chart-point" cx={x(props.mean)} cy="60" r="4"/>
    <text x={Math.max(48, Math.min(geometry.width() - 48, x(props.mean)))} y="20" text-anchor="middle">Mean {props.mean}</text>
    <text x={geometry.width() / 2} y="112" text-anchor="middle">Inputs per second</text>
    <Show when={props.value !== undefined}><g class="ai-chart-selection"><circle cx={x(props.value!)} cy="60" r="6"/><title>Selected run: {props.value} per second</title></g></Show>
    <Show when={inspected()}>{marker => <g class="ai-chart-selection"><circle cx={x(marker().value)} cy="60" r="6"/></g>}</Show>
  </svg><ChartScaleNote scale={scale()} unit="inputs/s"/><div class="ai-chart-detail-slot"><Show when={inspected()}>{marker => <ChartDetail previous={(hovered() ?? chosen() ?? 0) > 0 ? () => choose(0) : undefined} next={(hovered() ?? chosen() ?? 0) < markers().length - 1 ? () => choose(1) : undefined} close={close}>{marker().label}: <strong>{marker().value} inputs/s</strong></ChartDetail>}</Show></div></>;
}

export function Reference(props: { id: GameId; scope: string; value?: number; boardFormat?: 'standard' | 'compact' }) {
  const reference = createMemo(() => referenceFor(props.id, props.scope, props.boardFormat));
  const histogram = createMemo(() => { const ref = reference(); return ref?.kind === 'histogram' && summarizeBins(ref.bins) ? ref : null; });
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
