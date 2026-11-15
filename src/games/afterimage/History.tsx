import { Errored, For, Loading, Show, createEffect, createMemo, createSignal, lazy, onSettled } from 'solid-js';
import { Button } from '../../shared/components/Button.tsx';
import { ChevronLeft, ChevronRight, Trash2, X } from '../../shared/components/Icons.tsx';
import { readHistory, scopeChoices, initialScope, scoreKey, scopeUnit } from './history.ts';
import type { GameId } from './types.ts';
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
  const scope = () => chosen() || props.latestScope || initialScope(props.id);
  const data = createMemo(() => {
    void props.revision; void revision();
    try { return { rows: readHistory(scope()), options: scopeChoices(props.id), error: '' }; }
    catch { return { rows: [], options: [[scope(), scope()]] as [string, string][], error: 'Saved scores could not be read. Export a backup before changing browser storage.' }; }
  });
  const rows = () => data().rows;
  const selected = () => {
    const saved = selections()[scope()];
    if (!saved) return null;
    if (JSON.stringify(rows()[saved.index]) === saved.row) return saved.index;
    const index = rows().findIndex(row => JSON.stringify(row) === saved.row);
    return index < 0 ? null : index;
  };
  const setSelected = (index: number | null) => setSelections(previous => ({ ...previous, [scope()]: index === null ? undefined : { row: JSON.stringify(rows()[index]), index } }));
  createEffect(() => props.latestScope, latest => { if (latest) setChosen(latest); });
  const recent = () => rows().slice(-30);
  const offset = () => rows().length - recent().length;
  const metric = () => scopeUnit(props.id, scope());
  const selectedRow = () => selected() === null ? undefined : rows()[selected()!];
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
  const x = (index: number) => recent().length < 2 ? 300 : 28 + index / (recent().length - 1) * 544;
  const y = (value: number) => { const values = recent().map(row => row.value), min = Math.min(...values), max = Math.max(...values); return max === min ? 85 : 145 - (value - min) / (max - min) * 120; };
  function choose(index: number) { setSelected(Math.max(offset(), Math.min(rows().length - 1, index))); }
  function keys(event: KeyboardEvent) {
    if (!recent().length || event.altKey || event.ctrlKey || event.metaKey) return;
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
    const outside = (event: PointerEvent) => { if (selected() !== null && event.target instanceof Node && !chart?.contains(event.target) && !detail?.contains(event.target)) setSelected(null); };
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
      <p class="ai-history-metrics">{rows().length} {rows().length === 1 ? 'run' : 'runs'} <span>Average {(rows().reduce((sum, row) => sum + row.value, 0) / rows().length).toFixed(1)} {metric().unit}</span><span>Best {rows().reduce((best, row) => metric().lower ? Math.min(best, row.value) : Math.max(best, row.value), rows()[0]?.value ?? 0)} {metric().unit}</span></p>
      <svg ref={chart} class="ai-history-chart" viewBox="0 0 600 170" role="group" tabindex="0" aria-label="Recent scores. Select a point, or use arrow keys, Home and End to inspect runs. Escape closes details." onKeyDown={keys}>
        <path class="ai-chart-axis" d="M28 20V145H572"/>
        <polyline class="ai-chart-line" points={recent().map((row, index) => `${x(index)},${y(row.value)}`).join(' ')}/>
        <For each={recent()}>{(row, index) => <g class={['ai-chart-point', selected() === index() + offset() && 'selected']} onClick={() => choose(index() + offset())}><circle class="ai-chart-hit" cx={x(index())} cy={y(row.value)} r="13"/><circle cx={x(index())} cy={y(row.value)} r="4"/><title>{row.value} {metric().unit}</title></g>}</For>
        <text x="28" y="165">{recent().length > 1 ? 'Earlier' : ''}</text><text x="572" y="165" text-anchor="end">Latest</text>
      </svg>
      <Show when={rows().length > 30}><p class="ai-muted">Latest 30 of {rows().length}</p></Show>
      <Show when={selectedRow()}>{row => <div ref={detail} class="ai-point-detail" onKeyDown={keys}><p role="status">Run {(selected() ?? 0) + 1}: <strong>{row().value} {metric().unit}</strong><br/>{Number.isFinite(row().date) && !Number.isNaN(new Date(row().date).getTime()) ? new Date(row().date).toLocaleString() : 'Date unavailable'}</p><Button aria-label="Previous run" disabled={selected() === offset()} onClick={() => choose((selected() ?? 0) - 1)}><ChevronLeft size={18}/></Button><Button aria-label="Next run" disabled={selected() === rows().length - 1} onClick={() => choose((selected() ?? 0) + 1)}><ChevronRight size={18}/></Button><Button aria-label="Close details" onClick={closePoint}><X size={18}/></Button></div>}</Show>
    </Show>
    <Show when={clearConfirm()}><div class="ai-clear-confirm" role="alert"><p>Clear this results format? Export a backup first if you want to keep these runs.</p><Button onClick={clear}>Clear results</Button><Button onClick={() => setClearConfirm(false)}>Cancel</Button></div></Show>
    <Errored fallback={<p class="ai-muted">Reference data is unavailable.</p>}><Loading fallback={<p class="ai-muted">Loading reference…</p>}><Reference id={props.id} scope={scope()} value={selectedRow()?.value} boardFormat={boardFormat()}/></Loading></Errored>
  </section>;
}
