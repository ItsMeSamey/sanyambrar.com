import { Errored, For, Loading, Show, createEffect, createMemo, createSignal, lazy, onSettled } from 'solid-js';
import { Button } from '../../shared/components/Button.tsx';
import { ChevronLeft, ChevronRight, Trash2, X } from '../../shared/components/Icons.tsx';
import { readHistory, scopeChoices, initialScope, scoreKey, scopeUnit } from './history.ts';
import type { GameId } from './types.ts';
import { ChartGrid, useChartWidth } from './Chart.tsx';
import { chartLabel, chartPosition, chartScale } from './chart-model.ts';
const Reference = lazy(() => import('./Reference.tsx'), { export: 'Reference' });

export function History(props: { id: GameId; revision: number; latestScope?: string }) {
  const [chosen, setChosen] = createSignal('');
  const [selections, setSelections] = createSignal<Record<string, { row: string; index: number } | undefined>>({});
  const [clearConfirm, setClearConfirm] = createSignal(false);
  const [revision, setRevision] = createSignal(0);
  const [failure, setFailure] = createSignal('');
  const [boardFormat, setBoardFormat] = createSignal<'standard' | 'compact'>('compact');
  let chart: SVGSVGElement | undefined;
  let detail: HTMLDivElement | undefined;
  const geometry = useChartWidth();
  const scope = () => chosen() || props.latestScope || initialScope(props.id);
  const data = createMemo(() => {
    void props.revision; void revision();
    try { return { rows: readHistory(scope()), options: scopeChoices(props.id), error: '' }; }
    catch { return { rows: [], options: [[scope(), scope()]] as [string, string][], error: 'Saved scores could not be read. Export a backup before changing browser storage.' }; }
  });
  const rows = () => data().rows;
  const selected = createMemo(() => {
    const saved = selections()[scope()];
    if (!saved) return null;
    const index = JSON.stringify(rows()[saved.index]) === saved.row ? saved.index : rows().findIndex(row => JSON.stringify(row) === saved.row);
    return index < Math.max(0, rows().length - 30) ? null : index;
  });
  const setSelected = (index: number | null) => setSelections(previous => ({ ...previous, [scope()]: index === null ? undefined : { row: JSON.stringify(rows()[index]), index } }));
  createEffect(() => props.latestScope, latest => { if (latest) setChosen(latest); });
  const recent = createMemo(() => rows().slice(-30));
  const offset = () => rows().length - recent().length;
  const metric = () => scopeUnit(props.id, scope());
  const selectedRow = createMemo(() => selected() === null ? undefined : rows()[selected()!]);
  const summary = createMemo(() => {
    const values = rows(), lower = metric().lower;
    let total = 0, best = values[0]?.value ?? 0;
    for (const row of values) { total += row.value / values.length; best = lower ? Math.min(best, row.value) : Math.max(best, row.value); }
    return { average: total, best };
  });
  const scale = createMemo(() => chartScale(recent().map(row => row.value)));
  const recentAverage = createMemo(() => recent().reduce((sum, row) => sum + row.value / recent().length, 0));
  const current = () => {
    const value = scope();
    return value === initialScope(props.id) || /^(aim-v[46]-(standard|compact)-(mouse|pen)|aim-v6-(standard|compact)-(touch|keyboard)|chimp-v2-(standard|compact)-(mouse|touch|pen|keyboard)|pairs-v4-(mouse|touch|pen|keyboard)|order-v1-(mouse|touch|pen|keyboard)|reaction-v7-(desktop|touch-release|pen)|typing-v4-(hardware|onscreen)-passage|cps-v1-mouse-10s|tps-v3-touch-10s|sequence-v2-fresh|reverse-v2-(growing|fresh))$/.test(value);
  };
  const legacyVisualBest = () => {
    if (props.id !== 'visual' || current()) return null;
    const name = scope() === 'visual' ? 'standard' : scope() === 'visual-long' ? 'long' : scope();
    try { const value = Number(localStorage.getItem(`afterimage-best-${name}`)); return Number.isFinite(value) && value > 0 ? value : null; }
    catch { return null; }
  };
  const x = (index: number) => recent().length < 2 ? (44 + geometry.width() - 16) / 2 : 44 + index / (recent().length - 1) * (geometry.width() - 60);
  const y = (value: number) => chartPosition(value, scale(), 176, 24);
  const points = createMemo(() => recent().map((row, index) => `${x(index)},${y(row.value)}`).join(' '));
  function choose(index: number) { setSelected(Math.max(offset(), Math.min(rows().length - 1, index))); }
  function choosePoint(event: MouseEvent) {
    const bounds = event.currentTarget instanceof SVGSVGElement ? event.currentTarget.getBoundingClientRect() : null;
    if (!bounds || !bounds.width || event.clientY < bounds.top + 14 || event.clientY > bounds.top + 186) return;
    const position = (event.clientX - bounds.left) / bounds.width * geometry.width();
    choose(offset() + Math.round((position - 44) / (geometry.width() - 60) * (recent().length - 1)));
    chart?.focus({ preventScroll: true });
  }
  function keys(event: KeyboardEvent) {
    if (!recent().length || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target !== chart) {
      if (event.key === 'Escape') { event.preventDefault(); closePoint(); }
      return;
    }
    const index = selected() ?? rows().length - 1;
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Escape'].includes(event.key)) event.preventDefault();
    if (['ArrowRight', 'ArrowDown'].includes(event.key)) choose(selected() === null ? offset() : index + 1);
    if (['ArrowLeft', 'ArrowUp'].includes(event.key)) choose(index - (selected() === null ? 0 : 1));
    if (event.key === 'Home') choose(offset());
    if (['End', 'Enter', ' '].includes(event.key)) choose(rows().length - 1);
    if (event.key === 'Escape') closePoint();
  }
  function closePoint() { setSelected(null); chart?.focus(); }
  function clear() {
    try { localStorage.removeItem(scoreKey(scope())); setSelected(null); setClearConfirm(false); setRevision(value => value + 1); }
    catch { setFailure('History could not be cleared. Your saved scores have not been removed. Try again.'); setClearConfirm(false); }
  }
  onSettled(() => {
    const outside = (event: PointerEvent) => { if (selected() !== null && event.target instanceof Node && !chart?.contains(event.target) && !detail?.contains(event.target) && !(event.target instanceof Element && event.target.closest('.ai-history-scope'))) setSelected(null); };
    document.addEventListener('pointerdown', outside);
    const game = document.querySelector('.ai-game');
    const measureFormat = () => { const value = game?.querySelector('[data-chimp-format],[data-aim-format]')?.getAttribute(props.id === 'chimp' ? 'data-chimp-format' : 'data-aim-format'); setBoardFormat(value === 'standard' ? 'standard' : 'compact'); };
    const observer = new MutationObserver(measureFormat);
    if (game && ['chimp', 'aim'].includes(props.id)) observer.observe(game, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-chimp-format', 'data-aim-format'] });
    measureFormat();
    return () => { document.removeEventListener('pointerdown', outside); observer.disconnect(); };
  });
  return <section class="ai-history" aria-label="Score history"><header><h2>History</h2><Show when={current() && rows().length}><Button class="ai-history-clear" onClick={() => setClearConfirm(true)}><Trash2 size={16}/>Clear</Button></Show></header>
    <label class="ai-history-scope">Results<select value={scope()} onChange={event => { setChosen(event.currentTarget.value); setClearConfirm(false); }}><For each={data().options}>{option => <option value={option[0]}>{option[1]}</option>}</For></select></label>
    <Show when={!current()}><p class="ai-muted">Saved under earlier rules</p></Show>
    <Show when={legacyVisualBest()}>{value => <p class="ai-muted">Earlier personal best: {value()} levels</p>}</Show>
    <Show when={data().error}><p role="status" class="ai-storage-message">{data().error}</p></Show>
    <Show when={failure()}><p role="status" class="ai-storage-message">{failure()}</p></Show>
    <Show when={rows().length} fallback={<p class="ai-muted">No completed runs yet</p>}>
      <dl class="ai-history-metrics"><div><dt>Runs</dt><dd>{rows().length}</dd></div><div><dt>Average</dt><dd>{summary().average.toFixed(1)} <span>{metric().unit}</span></dd></div><div><dt>Best</dt><dd>{chartLabel(summary().best)} <span>{metric().unit}</span></dd></div></dl>
      <div class="ai-chart-heading"><span>{rows().length > 30 ? 'Latest 30 runs' : rows().length === 1 ? '1 run' : `${rows().length} runs`}</span><span class="ai-chart-legend">Average {recentAverage().toFixed(1)} {metric().unit}</span></div>
      <svg ref={element => { chart = element; geometry.ref(element); }} class="ai-history-chart" viewBox={`0 0 ${geometry.width()} 210`} role="group" tabindex="0" aria-label={`Recent scores in ${metric().unit}. Select a point, or use arrow keys, Home and End to inspect runs. Escape closes details.`} onKeyDown={keys} onClick={choosePoint}>
        <ChartGrid scale={scale()} width={geometry.width()} top={24} bottom={176}/>
        <path class="ai-chart-average" d={`M44 ${y(recentAverage())}H${geometry.width() - 16}`}/>
        <Show when={recent().length > 1}><polygon class="ai-chart-area" points={`${x(0)},176 ${points()} ${x(recent().length - 1)},176`}/></Show>
        <polyline class="ai-chart-line" points={points()}/>
        <For each={recent()}>{(row, index) => <circle class="ai-chart-point" cx={x(index())} cy={y(row.value)} r={recent().length > 15 ? 2.5 : 3.5}><title>Run {index() + offset() + 1}: {row.value} {metric().unit}</title></circle>}</For>
        <rect class="ai-chart-hit" x="34" y="14" width={geometry.width() - 40} height="172"/>
        <Show when={selectedRow()}>{row => <g class="ai-chart-selection" aria-hidden="true"><path d={`M${x((selected() ?? offset()) - offset())} 24V176`}/><circle cx={x((selected() ?? offset()) - offset())} cy={y(row().value)} r="6"/></g>}</Show>
        <text x={recent().length === 1 ? x(0) : 44} y="200" text-anchor={recent().length === 1 ? 'middle' : 'start'}>Run {offset() + 1}</text><Show when={recent().length > 1}><text x={geometry.width() - 16} y="200" text-anchor="end">Run {rows().length}</text></Show>
      </svg>
      <div class="ai-chart-detail-slot"><Show when={selectedRow()}>{row => <div ref={detail} class="ai-point-detail" onKeyDown={keys}><p role="status">Run {(selected() ?? 0) + 1}: <strong>{row().value} {metric().unit}</strong><br/>{Number.isFinite(row().date) && !Number.isNaN(new Date(row().date).getTime()) ? new Date(row().date).toLocaleString() : 'Date unavailable'}</p><div class="ai-point-actions"><Button aria-label="Previous run" disabled={selected() === offset()} onClick={() => choose((selected() ?? 0) - 1)}><ChevronLeft size={18}/></Button><Button aria-label="Next run" disabled={selected() === rows().length - 1} onClick={() => choose((selected() ?? 0) + 1)}><ChevronRight size={18}/></Button><Button aria-label="Close details" onClick={closePoint}><X size={18}/></Button></div></div>}</Show></div>
    </Show>
    <Show when={clearConfirm()}><div class="ai-clear-confirm" role="alert"><p>Clear this results format? Export a backup first if you want to keep these runs.</p><Button onClick={clear}>Clear results</Button><Button onClick={() => setClearConfirm(false)}>Cancel</Button></div></Show>
    <Errored fallback={<p class="ai-muted">Reference data is unavailable.</p>}><Loading fallback={<p class="ai-muted">Loading reference…</p>}><Reference id={props.id} scope={scope()} value={selectedRow()?.value} boardFormat={boardFormat()}/></Loading></Errored>
  </section>;
}
