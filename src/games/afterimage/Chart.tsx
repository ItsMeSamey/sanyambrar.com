import { createEffect, createSignal, For } from 'solid-js';
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
