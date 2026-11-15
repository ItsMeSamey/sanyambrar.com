import { createMemo, createSignal, For, onSettled, Show, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Button } from '../../shared/components/Button';
import { inputKind, Ready, Result, Stats, useTimers } from './common';
import { nextSequence, sequenceRules, shuffledRange, visualRound } from './memory-model';
import type { GameProps, GameResult, InputKind, Stat } from './types';
import './memory.css';

type Face = 'plain' | 'lit' | 'correct' | 'wrong' | 'missed' | 'complete';
type Cell = { face: Face; label: string; text?: string; inactive?: boolean; backFace?: Face };
type View = {
  cells: Cell[]; columns: number; phase: string; status: string;
  stats: Stat[]; result?: GameResult; order?: number[]; step?: number;
};
const location = (index: number, columns: number) => `Row ${Math.floor(index / columns) + 1}, column ${index % columns + 1}`;
const emptyCells = (count: number, columns: number): Cell[] => Array.from({ length: count }, (_, i) => ({ face: 'plain', label: location(i, columns) }));

function useInterrupt(interrupt: () => void, blur = false) {
  onSettled(() => {
    const hidden = () => { if (document.hidden) interrupt(); };
    document.addEventListener('visibilitychange', hidden);
    if (blur) window.addEventListener('blur', interrupt);
    return () => {
      document.removeEventListener('visibilitychange', hidden);
      if (blur) window.removeEventListener('blur', interrupt);
    };
  });
}

function MemoryBoard(props: {
  cells: Cell[]; columns: number; phase: string; kind: string;
  onPick: (index: number, event: Event) => void;
  boardRef?: (element: HTMLDivElement) => void;
  boardFormat?: 'standard' | 'compact';
  press?: boolean;
}): JSX.Element {
  const [focusIndex, setFocusIndex] = createSignal(0);
  const indices = createMemo(() => Array.from({ length: props.cells.length }, (_, i) => i));
  let board: HTMLDivElement | undefined;
  const held = new Set<number>(), keys = new Set<string>();
  let suppressClick = false;
  const timers = useTimers();
  const canPick = (index: number) => ['recall', 'ready', 'running'].includes(props.phase) && !props.cells[index]?.inactive;
  const focus = (index: number) => {
    setFocusIndex(index);
    board?.querySelectorAll<HTMLButtonElement>('button')[index]?.focus({ preventScroll: true });
  };
  const release = () => {
    if (!held.size && !keys.size) timers.after(() => { suppressClick = false; }, 0);
  };
  onSettled(() => {
    const up = (event: PointerEvent) => { held.delete(event.pointerId); release(); };
    const keyup = (event: KeyboardEvent) => { keys.delete(event.key); release(); };
    const reset = () => { held.clear(); keys.clear(); suppressClick = false; };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', reset);
    };
  });
  return <div ref={element => { board = element; props.boardRef?.(element); }}
    class={['ai-memory-board', `ai-memory-${props.kind}`, { 'is-review': props.phase === 'result' || props.phase === 'between' }]}
    style={{ '--memory-columns': props.columns }} data-chimp-format={props.kind === 'chimp' ? props.boardFormat : undefined}
    role="group" inert={props.phase === 'intro'} aria-hidden={props.phase === 'intro' ? 'true' : undefined}
    aria-label={props.phase === 'result' ? 'Completed board, read only' : 'Game board'}>
    <For each={indices()}>{index => <button type="button"
      class={['ai-memory-tile', `is-${props.cells[index]?.face ?? 'plain'}`]}
      aria-label={props.cells[index]?.label}
      aria-disabled={canPick(index) ? 'false' : 'true'}
      tabindex={props.phase !== 'intro' && focusIndex() === index ? 0 : -1}
      onFocus={() => setFocusIndex(index)}
      onPointerDown={event => {
        if (!props.press || event.button !== 0 || held.has(event.pointerId)) return;
        held.add(event.pointerId); suppressClick = true; event.preventDefault();
        focus(index);
        if (canPick(index)) props.onPick(index, event);
      }}
      onClick={event => {
        if (!canPick(index)) return;
        if (props.press && (event.detail !== 0 || suppressClick || held.size || keys.size)) return;
        props.onPick(index, event);
      }}
      onKeyDown={event => {
        const delta = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -props.columns, ArrowDown: props.columns } as Record<string, number>)[event.key];
        if (delta !== undefined) {
          event.preventDefault();
          const next = props.press ? (index + delta + props.cells.length) % props.cells.length : Math.max(0, Math.min(props.cells.length - 1, index + delta));
          focus(next);
        } else if (event.key === 'Enter' || event.key === ' ') {
          if (!props.press) { if (event.repeat) event.preventDefault(); return; }
          event.preventDefault();
          if (event.repeat || keys.has(event.key)) return;
          keys.add(event.key); suppressClick = true;
          if (canPick(index)) props.onPick(index, event);
        }
      }}><Show when={props.kind === 'visual'} fallback={<span class="ai-memory-face" aria-hidden="true">{props.cells[index]?.text}</span>}>
        <span class="ai-memory-flipper" aria-hidden="true"><span class="ai-memory-front" /><span class={['ai-memory-back', `is-${props.cells[index]?.backFace ?? 'lit'}`]} /></span>
      </Show></button>}</For>
  </div>;
}

function focusBoard(board: HTMLDivElement | undefined, index = 0) {
  board?.querySelectorAll<HTMLButtonElement>('button')[index]?.focus({ preventScroll: true });
}

function PatternMemory(props: GameProps): JSX.Element {
  const timers = useTimers();
  let level = 1, lives = 3, errors = 0, found = 0, size = 3, phase = 'intro';
  let targets = new Set([0, 4, 8]), chosen = new Set<number>(), shown = true, reveal = false;
  const backFaces = new Map<number, Face>();
  let result: GameResult | undefined, board: HTMLDivElement | undefined;
  let status = '';
  const snapshot = (): View => ({
    cells: emptyCells(size * size, size).map((cell, i) => {
      const face: Face = chosen.has(i) ? (targets.has(i) ? 'correct' : 'wrong') : reveal && targets.has(i) ? 'missed' : shown && targets.has(i) ? 'lit' : 'plain';
      if (face !== 'plain') backFaces.set(i, face);
      return { ...cell, face, backFace: backFaces.get(i) ?? 'lit', label: `${cell.label}${face === 'correct' ? ', correct' : face === 'wrong' ? ', incorrect' : face === 'missed' ? ', missed target' : ''}` };
    }), columns: size, phase, status, result,
    stats: [{ label: 'Level', value: level }, { label: 'Lives', value: lives, lives: true }, { label: 'Mistakes', value: `${errors} / 3` }],
  });
  const [view, setView] = createSignal<View>(snapshot());
  const publish = () => setView(snapshot());
  function best(value: number) {
    try {
      const key = 'afterimage-best-visual-v3-standard';
      localStorage.setItem(key, String(Math.max(Number(localStorage.getItem(key)) || 0, value)));
    } catch { /* Local best is optional when storage is unavailable. */ }
  }
  function round() {
    timers.clear(); phase = 'show'; errors = found = 0; chosen = new Set(); reveal = shown = false;
    const next = visualRound(level); size = next.size; targets = new Set(next.targets);
    status = `Remember the pattern · ${targets.size} tiles`; publish();
    timers.after(() => {
      shown = true; publish();
      timers.after(() => { shown = false; phase = 'recall'; status = `Your turn · 0 / ${targets.size} found`; publish(); onSettled(() => { focusBoard(board); }); }, 1200);
    }, 500);
  }
  function start() { level = 1; lives = 3; result = undefined; round(); }
  function pick(index: number) {
    if (phase !== 'recall' || chosen.has(index) || document.hidden) return;
    chosen.add(index);
    if (targets.has(index)) found++; else errors++;
    status = `Your turn · ${found} / ${targets.size} found`;
    if (found === targets.size) {
      phase = 'between'; level++; best(level); status = 'Pattern complete · next level coming up';
      timers.after(() => { chosen.clear(); publish(); timers.after(round, 500); }, 500);
    } else if (errors === 3) {
      phase = 'between'; lives--; reveal = true;
      status = `${lives ? 'One life down' : 'No lives left'} · missed tiles have a dashed edge.`;
      if (!lives) {
        phase = 'result'; timers.clear(); best(level);
        result = { value: level, scope: 'visual-v3-standard', unit: 'levels', details: { rulesVersion: 3, preview: 'standard' } };
        props.onFinish(result);
      } else timers.after(() => { reveal = false; chosen.clear(); publish(); timers.after(round, 500); }, 1500);
    }
    publish();
  }
  useInterrupt(() => {
    if (['intro', 'paused', 'result'].includes(phase)) return;
    timers.clear(); phase = 'paused'; status = 'Paused · resume with a fresh pattern at the same level.'; publish();
  });
  return <section class="ai-memory-game">
    <Show when={!view().result}><Stats items={view().stats} /></Show>
    <p class="ai-memory-status" role="status">{view().status}</p>
    <div class="ai-memory-stage">
      <Show when={view().phase !== 'intro' && view().phase !== 'paused'} fallback={<Ready preview onStart={() => phase === 'paused' ? round() : start()} label={view().phase === 'paused' ? 'Resume' : 'Start'}>
        <MemoryBoard cells={view().cells} columns={view().columns} phase="intro" kind="visual" onPick={pick} />
      </Ready>}>
        <MemoryBoard cells={view().cells} columns={view().columns} phase={view().phase} kind="visual" onPick={pick} boardRef={element => { board = element; }} />
      </Show>
    </div>
    <Show when={view().result}>{finished => <Result result={finished()} onRetry={start} />}</Show>
  </section>;
}

function SequenceMemory(props: GameProps): JSX.Element {
  const id = untrack(() => props.id), rules = sequenceRules(id), timers = useTimers();
  let phase = 'intro', level = 1, position = 0, sequence: number[] = [];
  let lit = new Set([0, 4, 7]), wrong = -1, expected = -1, status = '';
  const flashes = new Map<number, number>();
  let result: GameResult | undefined, board: HTMLDivElement | undefined;
  const order = () => rules.reverse ? [...sequence].reverse() : sequence;
  const snapshot = (): View => ({
    cells: emptyCells(9, 3).map((cell, i) => ({ ...cell,
      face: i === wrong ? 'wrong' : i === expected ? 'missed' : lit.has(i) ? 'lit' : 'plain',
      label: `${cell.label}${i === wrong ? ', incorrect choice' : i === expected ? ', expected next tile' : ''}`,
    })), columns: 3, phase, status, result, order: order(), step: position,
    stats: [{ label: 'Level', value: level }, { label: 'Recalled', value: `${position} / ${Math.max(sequence.length, 1)}` }],
  });
  const [view, setView] = createSignal<View>(snapshot());
  const publish = () => setView(snapshot());
  function round() {
    phase = 'show'; position = 0;
    sequence = nextSequence(id, sequence, level);
    if (!rules.standard) lit.clear();
    status = 'Watch the flashes'; publish();
    const current = [...sequence];
    current.forEach((index, step) => {
      timers.after(() => { lit.add(index); publish(); }, rules.lead + step * rules.spacing);
      timers.after(() => {
        lit.delete(index);
        if (step === current.length - 1) {
          phase = 'recall'; status = rules.reverse ? 'Your turn · reverse order' : 'Your turn';
          onSettled(() => { focusBoard(board); });
        }
        publish();
      }, rules.lead + rules.duration + step * rules.spacing);
    });
  }
  function start() {
    timers.clear(); level = 1; sequence = []; lit.clear(); flashes.clear(); wrong = expected = -1; result = undefined; round();
  }
  function pick(index: number) {
    if (phase !== 'recall' || document.hidden) return;
    const next = order()[position];
    if (index !== next) {
      wrong = index; expected = next ?? -1; lit.clear(); phase = 'result'; timers.clear();
      status = `Wrong tile at step ${position + 1}. The dashed tile was next.`;
      result = { value: rules.score(level), scope: rules.scope, unit: 'levels' };
      props.onFinish(result); publish(); return;
    }
    lit.add(index);
    const serial = (flashes.get(index) ?? 0) + 1;
    flashes.set(index, serial);
    timers.after(() => { if (flashes.get(index) === serial) { lit.delete(index); publish(); } }, 100);
    position++;
    if (position === sequence.length) {
      phase = 'between'; level++; status = 'Correct';
      if (rules.standard) { round(); return; }
      timers.after(round, 500);
    } else status = `${position} / ${sequence.length}`;
    publish();
  }
  useInterrupt(() => {
    if (phase === 'intro' || phase === 'result') return;
    timers.clear(); phase = 'intro'; level = 1; position = 0; sequence = []; lit = new Set([0, 4, 7]);
    status = 'Run interrupted. Start a fresh pattern.'; publish();
  });
  return <section class="ai-memory-game">
    <Show when={!view().result}><Stats items={view().stats} /></Show>
    <p class="ai-memory-status" role="status">{view().status}</p>
    <Show when={view().result}><SequenceReview order={view().order ?? []} step={view().step ?? 0} /></Show>
    <Show when={view().phase !== 'intro'} fallback={<Ready preview onStart={start}>
      <MemoryBoard cells={view().cells} columns={3} phase="intro" kind="sequence" onPick={pick} />
    </Ready>}>
      <MemoryBoard cells={view().cells} columns={3} phase={view().phase} kind="sequence" onPick={pick} boardRef={element => { board = element; }} />
    </Show>
    <Show when={view().result}>{finished => <Result result={finished()} onRetry={start} />}</Show>
  </section>;
}

function SequenceReview(props: { order: number[]; step: number }): JSX.Element {
  const steps = createMemo(() => props.order.map((tile, step) => ({ tile, step })).slice(Math.max(0, props.step - 3), props.step + 4));
  return <figure class="ai-sequence-review"><figcaption>Response order · step {props.step + 1} of {props.order.length}</figcaption>
    <ol tabindex="0" aria-label="Response order near the missed step"><For each={steps()}>{item => <li
      class={{ 'is-next': item.step === props.step }} aria-current={item.step === props.step ? 'step' : undefined}
      aria-label={`Step ${item.step + 1}: ${location(item.tile, 3)}${item.step === props.step ? ', expected next' : ''}`}>
      <svg viewBox="0 0 42 42" aria-hidden="true"><For each={Array.from({ length: 9 }, (_, i) => i)}>{index => <rect
        x={index % 3 * 14} y={Math.floor(index / 3) * 14} width="12" height="12" rx="2" class={{ 'is-lit': index === item.tile }} />}</For></svg>{item.step + 1}
    </li>}</For></ol>
  </figure>;
}

function ContinueRound(props: { onContinue: () => void; guard: boolean }): JSX.Element {
  let button: HTMLButtonElement | undefined;
  const [armed, setArmed] = createSignal(untrack(() => !props.guard));
  const timers = useTimers();
  onSettled(() => {
    button?.focus({ preventScroll: true });
    if (props.guard) timers.after(() => setArmed(true), 750);
  });
  return <div class="ai-memory-continue"><Button ref={element => { button = element; }}
    aria-disabled={armed() ? 'false' : 'true'} onClick={() => { if (armed()) props.onContinue(); }}
    onKeyDown={event => { if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault(); }}>Continue</Button></div>;
}

function OrderMemory(props: GameProps): JSX.Element {
  const [boardFormat, setBoardFormat] = createSignal<'standard' | 'compact'>('compact');
  let phase = 'intro', level = 1, lives = 3, position = 1, wrong = -1;
  let cells = [21, 1, 34, 11], input: InputKind | undefined, compact = false, revealed = false, status = '';
  let result: GameResult | undefined, board: HTMLDivElement | undefined;
  const count = () => Math.min(level + 3, 40);
  const snapshot = (): View => ({
    cells: emptyCells(40, 8).map((cell, index) => {
      const number = cells.indexOf(index) + 1;
      const active = number > 0 && number <= count() && number >= position;
      const visible = active && (count() <= 4 || position === 1 || revealed);
      const missed = revealed && number === position;
      return { face: index === wrong ? 'wrong' : missed ? 'missed' : active ? 'lit' : 'plain',
        text: visible ? String(number) : '', inactive: !active,
        label: `${cell.label}, ${active ? visible ? `number ${number}${missed ? ', expected next' : ''}` : 'hidden number' : 'empty position'}${index === wrong ? ', incorrect choice' : ''}` };
    }), columns: 8, phase, status, result,
    stats: [{ label: 'Numbers', value: count() }, { label: 'Lives', value: lives, lives: true }],
  });
  const [view, setView] = createSignal<View>(snapshot());
  const publish = () => setView(snapshot());
  const measure = () => {
    if (!board) return;
    const rect = board.getBoundingClientRect(), tile = board.querySelector('button')?.getBoundingClientRect();
    const isCompact = Math.abs(rect.width - 720) >= 1 || Math.abs(rect.height - 450) >= 1 || !tile || Math.abs(tile.width - 80) >= 1 || Math.abs(tile.height - 80) >= 1;
    setBoardFormat(isCompact ? 'compact' : 'standard');
    if (isCompact) compact = true;
  };
  const mountBoard = (element: HTMLDivElement) => { board = element; onSettled(measure); };
  function round() {
    phase = 'recall'; position = 1; wrong = -1; revealed = false; cells = shuffledRange(40).slice(0, count());
    status = count() > 4 ? 'Study the numbers. They hide when you select 1.' : 'Select the numbers in order.';
    publish(); onSettled(() => { measure(); focusBoard(board, cells[0]); });
  }
  function start() { level = 1; lives = 3; input = undefined; compact = false; result = undefined; round(); }
  function finish(value: number) {
    phase = 'result';
    result = { value, scope: `chimp-v2-${compact ? 'compact' : 'standard'}-${input ?? 'mouse'}`, unit: 'numbers', details: { inputKind: input ?? 'mouse', rulesVersion: 2 } };
    props.onFinish(result);
  }
  function pick(index: number, event: Event) {
    if (phase !== 'recall' || document.hidden) return;
    const source = inputKind(event);
    if (input && source !== input) { status = `This run uses ${input}. Restart to switch.`; publish(); return; }
    input = source; measure();
    const number = cells.indexOf(index) + 1;
    if (number !== position) {
      lives--; phase = 'between'; revealed = true; wrong = index; status = `Wrong tile. Next was ${position}.`;
      if (!lives) finish(count());
    } else {
      position++;
      if (position > count()) {
        const completed = count();
        phase = 'between'; level++; status = 'Correct. Continue when you are ready.';
        if (completed === 40) { status = 'Every number recalled'; finish(41); }
      } else status = '';
    }
    publish();
  }
  useInterrupt(() => {
    if (phase === 'intro' || phase === 'result') return;
    phase = 'intro'; level = 1; lives = 3; position = 1; wrong = -1; revealed = false; cells = [21, 1, 34, 11];
    status = 'Run interrupted. Start again when ready.'; publish();
  });
  onSettled(() => {
    const resize = () => { measure(); };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  });
  return <section class="ai-memory-game ai-order-memory">
    <Show when={!view().result}><Stats items={view().stats} /></Show>
    <p class="ai-memory-status" role="status">{view().status}</p>
    <Show when={view().phase === 'between'}><ContinueRound onContinue={round} guard={view().cells.some(cell => cell.face === 'wrong')} /></Show>
    <Show when={view().phase !== 'intro'} fallback={<Ready preview onStart={start}>
      <MemoryBoard cells={view().cells} columns={8} phase="intro" kind="chimp" boardFormat={boardFormat()} onPick={pick} boardRef={mountBoard} />
    </Ready>}>
      <MemoryBoard cells={view().cells} columns={8} phase={view().phase} kind="chimp" boardFormat={boardFormat()} onPick={pick} boardRef={mountBoard} />
    </Show>
    <Show when={view().result}>{finished => <Result result={finished()} onRetry={start} />}</Show>
  </section>;
}

function NumberOrder(props: GameProps): JSX.Element {
  const timers = useTimers();
  let phase = 'intro', values = Array.from({ length: 25 }, (_, i) => (i * 7 % 25) + 1);
  let next = 1, errors = 0, started = 0, elapsed = 0, input: InputKind | undefined, status = '';
  let result: GameResult | undefined, board: HTMLDivElement | undefined;
  const snapshot = (): View => ({
    cells: values.map(value => ({ face: value < next ? 'complete' : 'plain', text: String(value), label: `${value}${value < next ? ', completed' : ''}` })),
    columns: 5, phase, status, result,
    stats: [{ label: 'Next', value: Math.min(next, 25) }, { label: 'Time', value: `${elapsed.toFixed(1)} s` }, { label: 'Mistakes', value: errors }],
  });
  const [view, setView] = createSignal<View>(snapshot());
  const publish = () => setView(snapshot());
  function prepare() {
    timers.clear(); phase = 'ready'; next = 1; errors = 0; elapsed = 0; input = undefined; result = undefined;
    values = shuffledRange(25).map(value => value + 1); status = 'Select 1 to start.'; publish();
    onSettled(() => { focusBoard(board, values.indexOf(1)); });
  }
  function pick(index: number, event: Event) {
    if (!['ready', 'running'].includes(phase) || document.hidden) return;
    const source = inputKind(event);
    if (input && input !== source) { status = `${input} input · restart to switch`; publish(); return; }
    const value = values[index];
    if (value !== next) { errors++; status = `Select ${next}.`; publish(); return; }
    if (phase === 'ready') {
      input = source; started = performance.now(); phase = 'running';
      timers.every(() => { elapsed = (performance.now() - started) / 1000; publish(); }, 100);
    }
    next++; status = '';
    if (next === 26) {
      elapsed = Math.max(0, (performance.now() - started) / 1000); phase = 'result'; timers.clear();
      result = { value: Math.round(elapsed * 100) / 100, scope: `order-v1-${input ?? 'mouse'}`, unit: 's', lowerIsBetter: true,
        details: { errors, inputKind: input ?? 'mouse', rulesVersion: 1 } };
      status = `25 numbers · ${errors} ${errors === 1 ? 'error' : 'errors'}`;
      props.onFinish(result);
    }
    publish();
  }
  useInterrupt(() => {
    if (phase !== 'running') return;
    timers.clear(); phase = 'interrupted'; status = 'Run interrupted. This unfinished run was not scored.'; publish();
  }, true);
  return <section class="ai-memory-game">
    <Show when={!view().result}><Stats items={view().stats} /></Show>
    <p class="ai-memory-status" role="status">{view().status}</p>
    <Show when={view().phase !== 'intro' && view().phase !== 'interrupted'} fallback={<Ready preview onStart={prepare} label={view().phase === 'interrupted' ? 'Start again' : 'Start'}>
      <MemoryBoard cells={view().cells} columns={5} phase="intro" kind="number-order" press onPick={pick} />
    </Ready>}>
      <MemoryBoard cells={view().cells} columns={5} phase={view().phase} kind="number-order" press onPick={pick} boardRef={element => { board = element; }} />
    </Show>
    <Show when={view().result}>{finished => <Result result={finished()} onRetry={prepare} />}</Show>
  </section>;
}

export function MemoryGame(props: GameProps): JSX.Element {
  return <Show when={props.id === 'visual'} fallback={<Show when={props.id === 'chimp'} fallback={<Show when={props.id === 'number-order'} fallback={<SequenceMemory {...props} />}><NumberOrder {...props} /></Show>}><OrderMemory {...props} /></Show>}><PatternMemory {...props} /></Show>;
}
