import { createMemo, For, Show } from 'solid-js';
import type { GameId } from './types.ts';
import { referenceFor, summarizeBins, type HistogramReference } from './reference-model.ts';

function Histogram(props: { reference: HistogramReference }) {
  const summary = createMemo(() => summarizeBins(props.reference.bins)!);
  const width = () => 440 / props.reference.bins.length;
  const meanX = () => {
    const bins = props.reference.bins;
    const step = bins.length > 1 ? bins[1].id - bins[0].id : 1;
    return 24 + (summary().mean - bins[0].id) / step * width() + width() / 2;
  };
  return <>
    <p>Mean ≈ {summary().mean.toFixed(1)} {props.reference.unit} · Median bin: {summary().median}</p>
    <svg class="ai-reference-chart" viewBox="0 0 480 170" role="img" aria-label={`Human Benchmark binned score distribution, estimated mean ${summary().mean.toFixed(1)} ${props.reference.unit}, ${summary().total} published counts`} style={{ width: '100%', display: 'block' }}>
      <For each={props.reference.bins}>{(bin, index) => <rect x={24 + index() * width()} y={130 - bin.count / summary().maxCount * 115} width={Math.max(0.5, width() - 1)} height={bin.count / summary().maxCount * 115} fill="currentColor" fill-opacity=".55" rx="1"><title>Bin {bin.id}: {bin.count} observations ({(100 * bin.count / summary().total).toFixed(2)}%)</title></rect>}</For>
      <path d={`M ${meanX()} 8 V 134`} stroke="currentColor" stroke-width="2" stroke-dasharray="4 3"><title>Estimated mean {summary().mean.toFixed(1)} {props.reference.unit}</title></path>
      <text x="24" y="151" fill="currentColor" font-size="11">{props.reference.bins[0].id}</text>
      <text x="464" y="151" fill="currentColor" font-size="11" text-anchor="end">{props.reference.bins.at(-1)!.id} {props.reference.unit}</text>
    </svg>
    <a href={props.reference.source} target="_blank" rel="noopener noreferrer" title="Captured 11 November 2026. Mean estimated from bins; counts are observations, not unique people.">Source · Human Benchmark</a>
  </>;
}

export function Reference(props: { id: GameId; scope: string; value?: number; boardFormat?: 'standard' | 'compact' }) {
  const reference = createMemo(() => referenceFor(props.id, props.scope, props.boardFormat));
  const histogram = createMemo(() => { const ref = reference(); return ref?.kind === 'histogram' ? ref : null; });
  const mean = createMemo(() => { const ref = reference(); return ref?.kind === 'mean' ? ref : null; });
  return <Show when={reference()}><section class="ai-reference" aria-label="External reference"><details open><summary>{mean() ? 'External mean · mixed inputs' : 'Human Benchmark reference'}</summary>
    <Show when={histogram()}>{ref => <Histogram reference={ref()}/>}</Show>
    <Show when={mean()}>{ref => <>
      <p>Published mean: {ref().mean} per second · 10 seconds</p>
      <svg class="ai-reference-chart" viewBox="0 0 480 100" role="img" aria-label="CPS Test published mean: 6.66 inputs per second over 10 seconds. Mixed input devices; mean marker only, not a distribution." style={{ width: '100%', display: 'block' }}>
        <path d="M 24 60 H 456" stroke="currentColor" stroke-width="2"/>
        <For each={[0, 2, 4, 6, 8, 10]}>{value => <g><path d={`M ${24 + value * 43.2} 56 V 64`} stroke="currentColor"/><text x={24 + value * 43.2} y="83" fill="currentColor" font-size="11" text-anchor="middle">{value}</text></g>}</For>
        <path d={`M ${24 + ref().mean * 43.2} 35 V 64`} stroke="currentColor" stroke-width="2"/>
        <circle cx={24 + ref().mean * 43.2} cy="60" r="5" fill="currentColor"/>
        <text x={24 + ref().mean * 43.2} y="25" fill="currentColor" font-size="13" text-anchor="middle">Mean {ref().mean}</text>
      </svg>
      <a href={ref().source} target="_blank" rel="noopener noreferrer" title="Published 19 September 2026; retrieved 11 November 2026. Mouse, touch, pen and keyboard sessions pooled. Device averages and sample size unavailable.">Source · CPS Test / arealme</a>
    </>}</Show>
  </details></section></Show>;
}
