import { createEffect, createSignal, For } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Button } from '../../shared/components/Button.tsx';
import { ChevronLeft, ChevronRight, X } from '../../shared/components/Icons.tsx';
import { chartLabel, chartPosition, type ChartScale } from './chart-model.ts';

/** Keep SVG labels and hit targets in CSS pixels at every viewport width. */
export function useChartWidth() {
  const [element, setElement] = createSignal<SVGSVGElement>();
  const [width, setWidth] = createSignal(600);
  createEffect(element, target => {
    if (!target) return;
    const observer = new ResizeObserver(entries => {
      const measured = Math.round(entries[0]?.contentRect.width ?? 0);
      if (measured > 0) setWidth(measured);
    });
    observer.observe(target);
    return () => observer.disconnect();
  });
  return { width, ref: (target: SVGSVGElement) => { setElement(target); } };
}

export function ChartGrid(props: { scale: ChartScale; width: number; top: number; bottom: number; left?: number; percent?: boolean }) {
  const left = () => props.left ?? 44;
  const y = (value: number) => chartPosition(value, props.scale, props.bottom, props.top);
  return <g class="ai-chart-grid" aria-hidden="true"><For each={props.scale.ticks}>{value => <g><path d={`M${left()} ${y(value)}H${props.width - 16}`}/><text x={left() - 9} y={y(value)} dominant-baseline="middle" text-anchor="end">{chartLabel(value)}{props.percent ? '%' : ''}</text></g>}</For></g>;
}

export function ChartAxes(props: { width: number; horizontal: string; vertical: string }) {
  return <g class="ai-chart-labels" aria-hidden="true"><text x="44" y="12">{props.vertical}</text><text x={(44 + props.width - 16) / 2} y="224" text-anchor="middle">{props.horizontal}</text></g>;
}

export function ChartDetail(props: { children: JSX.Element; previous?: () => void; next?: () => void; close: () => void }) {
  return <div class="ai-point-detail" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); props.close(); } }}><p role="status">{props.children}</p><div class="ai-point-actions"><Button aria-label="Previous reference point" disabled={!props.previous} onClick={() => props.previous?.()}><ChevronLeft size={18}/></Button><Button aria-label="Next reference point" disabled={!props.next} onClick={() => props.next?.()}><ChevronRight size={18}/></Button><Button aria-label="Close reference details" onClick={() => props.close()}><X size={18}/></Button></div></div>;
}
