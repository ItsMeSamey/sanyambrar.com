import { Errored, For, Loading, Show, createMemo, createSignal, lazy, onSettled, untrack } from 'solid-js';
import * as Select from '@kobalte/core/select';
import { Button } from '../../shared/components/Button.tsx';
import { Check, ChevronLeft, ChevronRight, ChevronsUpDown, Trash2, X } from '../../shared/components/Icons.tsx';
import { readHistory, scopeChoices, initialScope, scoreKey, scopeUnit } from './history.ts';
import type { GameId } from './types.ts';
import { ChartAxes, ChartGrid, ChartScaleNote, useChartWidth } from './Chart.tsx';
import { chartGutter, chartLabel, chartPosition, chartScale, nearestChartIndex, scoreAxisLabel } from './chart-model.ts';
const Reference = lazy(() => import('./Reference.tsx'), { export: 'Reference' });

export function History(props: { id: GameId; revision: number; latestScope?: string }) {
  const [chosen, setChosen] = createSignal<{ active: string; value: string } | null>(null);
  const [hover, setHover] = createSignal<{ scope: string; index: number } | null>(null);
  const [selections, setSelections] = createSignal<Record<string, { row: string; index: number } | undefined>>({});
  const [clearConfirm, setClearConfirm] = createSignal(false);
  const [revision, setRevision] = createSignal(0);
  const [failure, setFailure] = createSignal('');
  let chart: SVGSVGElement | undefined;
  let detail: HTMLDivElement | undefined;
  const geometry = useChartWidth();
  const activeScope = () => props.latestScope || initialScope(props.id);
  const scope = () => chosen()?.active === activeScope() ? chosen()!.value : activeScope();
  const hovered = () => hover()?.scope === scope() ? hover()!.index : null;
  const setHovered = (index: number | null) => setHover(index === null ? null : { scope: scope(), index });
  const choices = createMemo(() => {
    void props.revision; void revision();
    const fallback: [string, string][] = [[activeScope(), 'Current results']];
    try { return { options: scopeChoices(props.id, activeScope()), error: '' }; }
    catch { return { options: fallback, error: 'Saved scores could not be read. Export a backup before changing browser storage.' }; }
  });
  const options = createMemo(() => choices().options.map(([value, label]) => ({ value, label })));
  const data = createMemo(() => {
    void props.revision; void revision();
    try { return { rows: readHistory(scope()), error: '' }; }
    catch { return { rows: [], error: 'Saved scores could not be read. Export a backup before changing browser storage.' }; }
  });
  const selectScope = (option: { value: string } | null) => untrack(() => {
    // Controlled selects can repeat their current value when their options refresh.
    if (!option || option.value === scope()) return;
    const active = activeScope();
    setChosen(previous => previous?.active === active && previous.value === option.value ? previous : { active, value: option.value });
    setHovered(null);
    setClearConfirm(false);
  });
  const rows = () => data().rows;
  const selected = createMemo(() => {
    const saved = selections()[scope()];
    if (!saved) return null;
    const index = JSON.stringify(rows()[saved.index]) === saved.row ? saved.index : rows().findIndex(row => JSON.stringify(row) === saved.row);
    return index < Math.max(0, rows().length - 30) ? null : index;
  });
  const setSelected = (index: number | null) => setSelections(previous => ({ ...previous, [scope()]: index === null ? undefined : { row: JSON.stringify(rows()[index]), index } }));
  const recent = createMemo(() => rows().slice(-30));
  const offset = () => rows().length - recent().length;
  const metric = () => scopeUnit(props.id, scope());
  const inspected = () => hovered() ?? selected();
  const selectedRow = createMemo(() => inspected() === null ? undefined : rows()[inspected()!]);
  const summary = createMemo(() => {
    const values = rows(), lower = metric().lower;
    let total = 0, best = values[0]?.value ?? 0;
    for (const row of values) { total += row.value / values.length; best = lower ? Math.min(best, row.value) : Math.max(best, row.value); }
    return { average: total, best: Math.max(best, visualStoredBest() ?? best) };
  });
  const scale = createMemo(() => chartScale(recent().map(row => row.value)));
  const left = () => chartGutter(scale());
  const recentAverage = createMemo(() => recent().reduce((sum, row) => sum + row.value / recent().length, 0));
  const current = () => {
    const value = scope();
    if (props.id === 'deduction' && /^deduction-v3-(letters|images)-60s$/.test(value)) return true;
    return value === initialScope(props.id) || /^(aim-v[46]-(standard|compact)-(mouse|pen)|aim-v6-(standard|compact)-(touch|keyboard)|chimp-v3-(standard|compact)-(mouse|touch|pen|keyboard)|pairs-v4-(mouse|touch|pen|keyboard)|order-v2-(mouse|touch|pen|keyboard)|reaction-v7-(desktop|touch-release|pen)|typing-v4-(hardware|onscreen)-passage|cps-v1-mouse-10s|tps-v3-touch-10s|sequence-v3-growing|sequence-v2-fresh|reverse-v2-(growing|fresh))$/.test(value);
  };
  function visualStoredBest() {
    void props.revision; void revision();
    if (props.id !== 'visual') return null;
    const name = scope() === 'visual' ? 'standard' : scope() === 'visual-long' ? 'long' : scope();
    try { const value = Number(localStorage.getItem(`afterimage-best-${name}`)); return Number.isFinite(value) && value > 0 ? value : null; }
    catch { return null; }
  }
  const x = (index: number) => recent().length < 2 ? (left() + geometry.width() - 16) / 2 : left() + index / (recent().length - 1) * (geometry.width() - left() - 16);
  const y = (value: number) => chartPosition(value, scale(), 176, 24);
  const points = createMemo(() => recent().map((row, index) => `${x(index)},${y(row.value)}`).join(' '));
  function choose(index: number) { setHovered(null); setSelected(Math.max(offset(), Math.min(rows().length - 1, index))); }
  function pointAt(event: MouseEvent) {
    const bounds = event.currentTarget instanceof SVGSVGElement ? event.currentTarget.getBoundingClientRect() : null;
    if (!bounds || !bounds.width || event.clientY < bounds.top + 14 || event.clientY > bounds.top + 186) return null;
    const position = (event.clientX - bounds.left) / bounds.width * geometry.width();
    const index = nearestChartIndex(position, left(), geometry.width() - 16, recent().length);
    return index === null ? null : offset() + index;
  }
  function choosePoint(event: MouseEvent) {
    const index = pointAt(event);
    if (index === null) return;
    choose(index);
    chart?.focus({ preventScroll: true });
  }
  function keys(event: KeyboardEvent) {
    if (!recent().length || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target !== chart) {
      if (event.key === 'Escape') { event.preventDefault(); closePoint(); }
      return;
    }
    setHovered(null);
    const index = selected() ?? rows().length - 1;
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Escape'].includes(event.key)) event.preventDefault();
    if (['ArrowRight', 'ArrowDown'].includes(event.key)) choose(selected() === null ? offset() : index + 1);
    if (['ArrowLeft', 'ArrowUp'].includes(event.key)) choose(index - (selected() === null ? 0 : 1));
    if (event.key === 'Home') choose(offset());
    if (['End', 'Enter', ' '].includes(event.key)) choose(rows().length - 1);
    if (event.key === 'Escape') closePoint();
  }
  function closePoint() { setHovered(null); setSelected(null); chart?.focus(); }
  function clear() {
    try {
      localStorage.removeItem(scoreKey(scope()));
      if (props.id === 'visual' && current()) localStorage.removeItem(`afterimage-best-${scope()}`);
      setFailure(''); setSelected(null); setHovered(null); setChosen(null); setClearConfirm(false); setRevision(value => value + 1);
    }
    catch { setFailure('History could not be fully cleared. Try again.'); setClearConfirm(false); setRevision(value => value + 1); }
  }
  onSettled(() => {
    const outside = (event: PointerEvent) => { if (selected() !== null && event.target instanceof Node && !chart?.contains(event.target) && !detail?.contains(event.target) && !(event.target instanceof Element && event.target.closest('.ai-history-scope,.ai-history-select-content,.ai-reference'))) setSelected(null); };
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('pointerdown', outside); };
  });
  return <section class="ai-history" aria-label="Score history"><header><h2>History</h2><Show when={current() && (rows().length || visualStoredBest())}><Button class="ai-history-clear" onClick={() => setClearConfirm(true)}><Trash2 size={16}/>Clear</Button></Show></header>
    <Show when={options().length > 1}><div class="ai-history-scope"><span>Results</span><Select.Root options={options()} optionValue="value" optionTextValue="label" value={options().find(option => option.value === scope())} onChange={selectScope} itemComponent={item => <Select.Item class="ai-history-select-item" item={item.item}><Select.ItemLabel>{item.item.rawValue.label}</Select.ItemLabel><Select.ItemIndicator class="ai-history-select-check"><Check size={14}/></Select.ItemIndicator></Select.Item>}>
      <Select.Trigger class="ai-history-select-trigger" aria-label="Results"><Select.Value<{ value: string; label: string }> class="ai-history-select-value">{state => state.selectedOption()?.label}</Select.Value><Select.Icon class="ai-history-select-icon"><ChevronsUpDown size={14}/></Select.Icon></Select.Trigger>
      <Select.Portal><Select.Content class="ai-history-select-content" data-samey-overlay=""><Select.Listbox class="ai-history-select-list"/></Select.Content></Select.Portal>
    </Select.Root></div></Show>
    <Show when={!current()}><p class="ai-muted">Saved under earlier rules</p></Show>
    <Show when={!rows().length && visualStoredBest()}>{value => <p class="ai-muted">{current() ? 'Personal best' : 'Earlier personal best'}: {value()} levels</p>}</Show>
    <Show when={data().error || choices().error}>{message => <p role="status" class="ai-storage-message">{message()}</p>}</Show>
    <Show when={failure()}><p role="status" class="ai-storage-message">{failure()}</p></Show>
    <Show when={rows().length} fallback={<p class="ai-muted">No completed runs yet</p>}>
      <dl class="ai-history-metrics"><div><dt>Runs</dt><dd>{rows().length}</dd></div><div><dt>Average</dt><dd>{summary().average.toFixed(1)} <span>{metric().unit}</span></dd></div><div><dt>Personal best</dt><dd>{chartLabel(summary().best)} <span>{metric().unit}</span></dd></div></dl>
      <div class="ai-chart-heading"><span>{rows().length > 30 ? 'Latest 30 runs' : rows().length === 1 ? '1 run' : `${rows().length} runs`}</span><span class="ai-chart-legend">Average {recentAverage().toFixed(1)} {metric().unit}</span></div>
      <svg ref={element => { chart = element; geometry.ref(element); }} class="ai-history-chart" viewBox={`0 0 ${geometry.width()} 236`} role="group" tabindex="0" aria-label={`Recent scores. Horizontal axis: run number. Vertical axis: ${scoreAxisLabel(metric().unit)}. Select a point, or use arrow keys, Home and End to inspect runs. Escape closes details.`} onKeyDown={keys} onClick={choosePoint} onPointerMove={event => { if (event.pointerType !== 'touch') setHovered(pointAt(event)); }} onPointerLeave={() => setHovered(null)}>
        <ChartAxes width={geometry.width()} left={left()} horizontal="Run number" vertical={scoreAxisLabel(metric().unit)}/>
        <ChartGrid scale={scale()} width={geometry.width()} top={24} bottom={176}/>
        <path class="ai-chart-average" d={`M${left()} ${y(recentAverage())}H${geometry.width() - 16}`}/>
        <Show when={recent().length > 1}><polygon class="ai-chart-area" points={`${x(0)},176 ${points()} ${x(recent().length - 1)},176`}/></Show>
        <polyline class="ai-chart-line" points={points()}/>
        <For each={recent()}>{(row, index) => <circle class="ai-chart-point" cx={x(index())} cy={y(row.value)} r={recent().length > 15 ? 2.5 : 3.5}><title>Run {index() + offset() + 1}: {row.value} {metric().unit}</title></circle>}</For>
        <rect class="ai-chart-hit" x={left() - 10} y="14" width={geometry.width() - left() + 4} height="172"/>
        <Show when={selectedRow()}>{row => <g class="ai-chart-selection" aria-hidden="true"><path d={`M${x((inspected() ?? offset()) - offset())} 24V176`}/><circle cx={x((inspected() ?? offset()) - offset())} cy={y(row().value)} r="6"/></g>}</Show>
        <text x={recent().length === 1 ? x(0) : left()} y="200" text-anchor={recent().length === 1 ? 'middle' : 'start'}>Run {offset() + 1}</text><Show when={recent().length > 1}><text x={geometry.width() - 16} y="200" text-anchor="end">Run {rows().length}</text></Show>
      </svg>
      <ChartScaleNote scale={scale()} unit={metric().unit}/>
      <div class="ai-chart-detail-slot"><Show when={selectedRow()}>{row => <div ref={detail} class="ai-point-detail" onKeyDown={keys}><p role="status">Run {(inspected() ?? 0) + 1}: <strong>{row().value} {metric().unit}</strong><br/>{Number.isFinite(row().date) && !Number.isNaN(new Date(row().date).getTime()) ? new Date(row().date).toLocaleString() : 'Date unavailable'}</p><div class="ai-point-actions"><Button aria-label="Previous run" disabled={inspected() === offset()} onClick={() => choose((inspected() ?? 0) - 1)}><ChevronLeft size={18}/></Button><Button aria-label="Next run" disabled={inspected() === rows().length - 1} onClick={() => choose((inspected() ?? 0) + 1)}><ChevronRight size={18}/></Button><Button aria-label="Close details" onClick={closePoint}><X size={18}/></Button></div></div>}</Show></div>
    </Show>
    <Show when={clearConfirm()}><div class="ai-clear-confirm" role="alert"><p>Clear runs and personal best for this results format? Export a backup first if you want to keep them.</p><Button onClick={clear}>Clear results</Button><Button onClick={() => setClearConfirm(false)}>Cancel</Button></div></Show>
    <section class="ai-reference" aria-label="Benchmark averages"><h2>Averages</h2>
      <Errored fallback={<p class="ai-muted">Benchmark measurements could not be loaded.</p>}><Loading fallback={<p class="ai-muted">Loading averages…</p>}><Reference id={props.id} scope={scope()} value={selectedRow()?.value}/></Loading></Errored>
    </section>
  </section>;
}
