import { For, Show, createSignal, onCleanup, onSettled } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Button } from '../../shared/components/Button.tsx';
import { Check, CirclePlay, RotateCw, X } from '../../shared/components/Icons.tsx';
import { topLayer } from '../../shared/overlay.ts';
import { Stats, inputKind, useGameContextMenu, useGameLayerInterrupt, useGamePress, useTimers } from './common.tsx';
import { GameRules } from './GameRules.tsx';
import { createPairDeck, type PairCard as Card } from './pair-objects.ts';
import { BoardResult } from './BoardResult.tsx';
import type { GameProps, GameResult, InputKind } from './types.ts';
import './pair.css';

type Phase = 'study' | 'conceal' | 'ready' | 'resolving' | 'transition' | 'finished' | 'cancelled';
type Run = {
  phase: Phase; round: number; cards: Card[]; open: number[]; matched: number[];
  first: number | null; lives: number; matches: number; moves: number;
  input: InputKind | null; message: string; notice: boolean; mismatch: number[]; result: GameResult | null;
};

function initialRun(): Run {
  const cards = createPairDeck(0);
  return { phase: 'study', round: 0, cards, open: cards.map(card => card.index), matched: [], first: null,
    lives: 3, matches: 0, moves: 0, input: null, message: '', notice: false, mismatch: [], result: null };
}

export function PairGame(props: GameProps) {
  // Event state is synchronous; Solid 2 stages the corresponding rendered state.
  let current = initialRun();
  const [run, setRun] = createSignal(current);
  const [cursor, setCursor] = createSignal(0);
  const [columnCount, setColumnCount] = createSignal(2);
  const [scrollable, setScrollable] = createSignal(false);
  const timers = useTimers();
  const presses = useGamePress();
  const cards = new Map<number, HTMLButtonElement>();
  const touchStarts = new Map<number, { index: number; x: number; y: number; scroll: number }>();
  let board!: HTMLDivElement;
  useGameContextMenu(() => board, () => current.phase !== 'finished' && current.phase !== 'cancelled');
  let ready!: HTMLButtonElement;
  let columns = 2;
  let held = false;
  let disposed = false;
  let frame = 0;

  function update(next: Run) { current = next; setRun(next); }
  function clear() { timers.clear(); cancelAnimationFrame(frame); held = false; touchStarts.clear(); }
  function fitColumns() {
    const width = board?.clientWidth || 320;
    columns = Math.min(Math.max(2, Math.min(6, Math.floor((width + 14) / 62))), Math.max(2, Math.ceil(Math.sqrt(current.cards.length))));
    setColumnCount(columns);
    timers.after(() => { if (!disposed) setScrollable(board.scrollHeight > board.clientHeight + 1); }, 0);
  }
  function focusCard(index: number, scroll = true) {
    if (document.hidden || topLayer()) return;
    setCursor(index);
    const target = cards.get(index);
    target?.focus({ preventScroll: true });
    if (scroll) target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function focusAfterRender(action: () => void) {
    timers.after(() => {
      if (!disposed && !document.hidden && !topLayer() && (document.activeElement === document.body || document.activeElement === ready || board.contains(document.activeElement))) action();
    }, 0);
  }
  function retry() {
    if (document.hidden || topLayer()) return;
    props.onActivityChange?.(false);
    clear(); cards.clear(); update(initialRun()); setCursor(0); fitColumns();
    focusAfterRender(() => { if (current.phase === 'study') ready?.focus({ preventScroll: true }); });
  }
  function accepts(event: Event) {
    if (disposed || document.hidden || topLayer()) return false;
    const kind = inputKind(event);
    if (current.input && current.input !== kind) {
      update({ ...current, message: `Use ${current.input} for this run. Restart to switch.`, notice: true });
      return false;
    }
    return true;
  }
  function hide(event: Event) {
    if (current.phase !== 'study' || !accepts(event)) return;
    const input = inputKind(event);
    props.onScopeChange?.(`pairs-v4-${input}`);
    update({ ...current, phase: 'conceal', input, open: [], message: 'Cards turning over.', notice: false });
    // Begin the lock after the staged faces have committed to the DOM.
    frame = requestAnimationFrame(() => {
      timers.after(() => {
        if (current.phase !== 'conceal') return;
        update({ ...current, phase: 'ready', message: 'Find every pair.' });
        if (input === 'keyboard') focusAfterRender(() => focusCard(0));
      }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 320);
    });
  }
  function finish(lastMismatch: number[]) {
    if (current.phase !== 'resolving' || current.lives !== 0 || current.result) return;
    clear();
    const result: GameResult = {
      value: current.round, scope: `pairs-v4-${current.input ?? 'mouse'}`, unit: 'rounds',
      details: { rounds: current.round, matches: current.matches, moves: current.moves, lives: 0,
        inputKind: current.input ?? 'mouse', rulesVersion: 4 },
    };
    update({ ...current, phase: 'finished', result, mismatch: lastMismatch,
      open: current.cards.map(card => card.index), message: 'Crosses mark your picks; numbers mark pairs.', notice: true });
    setCursor(lastMismatch[1]);
    if (current.input === 'keyboard') focusAfterRender(() => focusCard(lastMismatch[1], false));
    props.onFinish(result);
  }
  function pick(index: number, event: Event) {
    if (current.phase !== 'ready' || !accepts(event) || current.open.includes(index) || current.matched.includes(index)) return;
    props.onActivityChange?.(true);
    const first = current.first;
    const next: Run = { ...current, open: [...current.open, index], first: index, message: 'Find its matching card.', notice: false };
    if (first === null) { update(next); return; }
    next.first = null; next.moves++;
    if (next.cards[first].value !== next.cards[index].value) {
      next.phase = 'resolving'; next.lives--; next.message = next.lives ? 'Not a pair. Study these two cards.' : 'No lives left.';
      update(next);
      timers.after(() => {
        if (current.phase !== 'resolving') return;
        if (!current.lives) { finish([first, index]); return; }
        update({ ...current, phase: 'ready', open: current.open.filter(value => value !== first && value !== index), message: 'Try another pair.' });
      }, 600);
      return;
    }
    next.matches++; next.matched = [...current.matched, first, index]; next.message = 'Pair found.';
    if (next.matched.length === next.cards.length) {
      next.phase = 'transition'; next.message = 'Round complete.';
      update(next);
      timers.after(() => {
        if (current.phase !== 'transition') return;
        const round = current.round + 1;
        const nextCards = createPairDeck(round);
        cards.clear();
        update({ ...current, round, cards: nextCards, phase: 'study', open: nextCards.map(card => card.index), matched: [], mismatch: [], message: '' });
        setCursor(0); fitColumns();
        if (current.input === 'keyboard') focusAfterRender(() => ready?.focus({ preventScroll: true }));
      }, 700);
      return;
    }
    update(next);
  }
  function cancel() {
    if (disposed || current.phase === 'finished' || current.phase === 'cancelled') return;
    if (current.phase === 'study' && current.round === 0 && !current.input) return;
    clear(); update({ ...current, phase: 'cancelled', message: 'Run interrupted. This unfinished run was not scored.', notice: true });
    props.onActivityChange?.(false);
  }
  useGameLayerInterrupt(cancel);
  function keydown(event: KeyboardEvent) {
    if (document.hidden || topLayer() || current.phase === 'finished' || current.phase === 'cancelled') return;
    if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const index = target.dataset.pairIndex === undefined ? null : Number(target.dataset.pairIndex);
    if (index === null && !target.hasAttribute('data-pair-ready')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (event.repeat || held || target.disabled) return;
      held = true;
      if (index === null) hide(event); else pick(index, event);
      return;
    }
    if (index === null || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? current.cards.length - 1 : index + offsets[event.key];
    if (next < 0 || next >= current.cards.length || event.key === 'ArrowLeft' && index % columns === 0 || event.key === 'ArrowRight' && index % columns === columns - 1) return;
    focusCard(next);
  }
  function review(card: Card) {
    if (run().phase !== 'finished') return null;
    const pair = run().mismatch.findIndex(index => run().cards[index].value === card.value);
    return pair < 0 ? null : { number: pair + 1, picked: run().mismatch.includes(card.index) };
  }
  const mismatched = (index: number) => run().phase === 'resolving' && run().open.includes(index) && !run().matched.includes(index);
  function label(card: Card) {
    const state = run();
    const shown = state.matched.includes(card.index) ? `matched ${card.object.name}` : state.open.includes(card.index) ? card.object.name : 'face down';
    const marker = review(card);
    return `Card ${card.index + 1}, ${shown}${marker ? `, ${marker.picked ? 'your last pick' : 'matching card for pick'} ${marker.number}` : ''}`;
  }
  onSettled(() => {
    fitColumns();
    const observer = new ResizeObserver(fitColumns);
    observer.observe(board);
    const visibility = () => { if (document.hidden) cancel(); };
    const keyup = (event: KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') held = false; };
    const releaseTouch = (event: PointerEvent) => { touchStarts.delete(event.pointerId); };
    window.addEventListener('blur', cancel);
    window.addEventListener('pagehide', cancel);
    window.addEventListener('keyup', keyup);
    window.addEventListener('pointerup', releaseTouch);
    window.addEventListener('pointercancel', releaseTouch);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      observer.disconnect(); window.removeEventListener('blur', cancel); window.removeEventListener('pagehide', cancel);
      window.removeEventListener('keyup', keyup); document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pointerup', releaseTouch); window.removeEventListener('pointercancel', releaseTouch);
    };
  });
  onCleanup(() => { disposed = true; clear(); props.onActivityChange?.(false); });

  return <section class="pair-memory" data-phase={run().phase} onKeyDown={keydown} aria-label="Pair memory">
      <Stats items={[{ label: 'Round', value: run().round + 1 }, { label: 'Pairs left', value: (run().cards.length - run().matched.length) / 2 }, { label: 'Lives', value: run().lives, lives: true }]}/>
    <div class="pair-stage">
    <div ref={board} class={['pair-board', run().phase === 'finished' && 'is-review', scrollable() && 'is-scrollable']}
      data-game-input={run().phase !== 'finished' && run().phase !== 'cancelled' ? '' : undefined} inert={run().phase === 'cancelled'} role="group" tabindex={scrollable() ? 0 : -1}
      aria-label={run().phase === 'finished' ? 'Matching cards, read only. Scroll to inspect every card.' : 'Matching cards. Use arrow keys to move between cards.'}
      style={{ '--pair-columns': columnCount() } as JSX.CSSProperties}>
      <For each={run().cards}>{card => <button ref={element => { cards.set(card.index, element); }}
        type="button" class={['pair-card', run().open.includes(card.index) && 'is-open', run().matched.includes(card.index) && 'is-matched', mismatched(card.index) && 'is-mismatch']} data-pair-index={card.index}
        data-review={review(card)?.picked ? 'picked' : review(card) ? 'counterpart' : undefined}
        data-review-pair={review(card)?.number}
        disabled={run().phase === 'study' || run().phase === 'conceal'}
        aria-disabled={run().phase !== 'ready' || run().open.includes(card.index) ? 'true' : 'false'}
        aria-label={label(card)} tabindex={run().phase !== 'finished' && cursor() === card.index ? 0 : -1}
        onFocus={() => setCursor(card.index)}
        onPointerDown={event => {
          if (current.phase !== 'ready' || document.hidden || topLayer() || event.button !== 0) return;
          if (event.pointerType === 'touch' && scrollable()) {
            if (!touchStarts.has(event.pointerId)) touchStarts.set(event.pointerId, { index: card.index, x: event.clientX, y: event.clientY, scroll: board.scrollTop });
            return;
          }
          if (!presses.down(event)) return;
          focusCard(card.index); pick(card.index, event);
        }}
        onPointerUp={event => {
          const start = touchStarts.get(event.pointerId);
          touchStarts.delete(event.pointerId);
          if (document.hidden || topLayer() || !start || start.index !== card.index || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8 || Math.abs(board.scrollTop - start.scroll) > 1 || current.phase !== 'ready') return;
          focusCard(card.index, false); pick(card.index, event);
        }}
        onPointerMove={event => {
          const start = touchStarts.get(event.pointerId);
          if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) touchStarts.delete(event.pointerId);
        }}
        onPointerCancel={event => { touchStarts.delete(event.pointerId); }}
        onClick={event => { if (current.phase !== 'ready') return; event.preventDefault(); if (!held && presses.click(event)) pick(card.index, event); }}>
        <span class="pair-face" aria-hidden="true">
          <Show when={card.object.svg} fallback={card.object.name}>
            <svg xmlns="http://www.w3.org/2000/svg" class="pair-object" viewBox={card.object.viewBox} aria-hidden="true" innerHTML={card.artwork}/>
          </Show>
        </span>
        <Show when={review(card)}>{marker => <span class="pair-review-marker" aria-hidden="true">{marker().number}<Show when={marker().picked}><X size={11}/></Show></span>}</Show>
        <Show when={run().matched.includes(card.index)}><span class="pair-matched-marker" aria-hidden="true"><Check size={13}/></span></Show>
        <Show when={mismatched(card.index)}><span class="pair-mismatch-marker" aria-hidden="true"><X size={13}/></span></Show>
      </button>}</For>
    </div>
    <Show when={run().phase === 'cancelled'}><div class="pair-cancelled"><Button class="pair-replay ai-primary" onClick={retry}><RotateCw size={18}/>Play again</Button></div></Show>
    <Show when={run().result}>{result => <BoardResult result={result()} onRetry={retry} />}</Show>
    <Show when={run().phase === 'study' || run().phase === 'conceal'}>
      <div class="pair-actions"><Button ref={ready} class="pair-ready ai-primary" data-pair-ready="true" disabled={run().phase === 'conceal'} onClick={event => { if (!held) hide(event); }}><CirclePlay size={18}/>Start</Button></div>
    </Show>
    </div>
    <Show when={run().phase === 'study'}><GameRules detail="Each mismatch costs a life. Match every pair to reach the next round; three mismatches end the run.">Start hides the cards. Turn over two at a time to find matching pictures.</GameRules></Show>
    <p class="pair-status-line" aria-live="polite"><span class={{ 'ai-sr-only': !run().notice }}>{run().message}</span></p>
  </section>;
}
