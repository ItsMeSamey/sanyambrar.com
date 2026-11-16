import { For, Show, createSignal, onCleanup, onSettled } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Button } from '../../shared/components/Button.tsx';
import { Check, CirclePlay, Redo2, X } from '../../shared/components/Icons.tsx';
import { Stats, Result, inputKind, useGamePress, useTimers } from './common.tsx';
import { createPairDeck, type PairCard as Card } from './pair-objects.ts';
import type { GameProps, GameResult, InputKind } from './types.ts';
import './pair.css';

type Phase = 'study' | 'conceal' | 'ready' | 'resolving' | 'transition' | 'finished' | 'cancelled';
type Run = {
  phase: Phase; round: number; cards: Card[]; open: number[]; matched: number[];
  first: number | null; lives: number; matches: number; moves: number;
  input: InputKind | null; message: string; mismatch: number[]; result: GameResult | null;
};

function initialRun(): Run {
  const cards = createPairDeck(0);
  return { phase: 'study', round: 0, cards, open: cards.map(card => card.index), matched: [], first: null,
    lives: 3, matches: 0, moves: 0, input: null, message: 'Study the cards for as long as you like.', mismatch: [], result: null };
}

export function PairGame(props: GameProps) {
  // Event state is synchronous; Solid 2 stages the corresponding rendered state.
  let current = initialRun();
  const [run, setRun] = createSignal(current);
  const [cursor, setCursor] = createSignal(0);
  const [columnCount, setColumnCount] = createSignal(2);
  const timers = useTimers();
  const presses = useGamePress();
  const cards = new Map<number, HTMLButtonElement>();
  let board!: HTMLDivElement;
  let ready!: HTMLButtonElement;
  let columns = 2;
  let held = false;
  let disposed = false;
  let frame = 0;

  function update(next: Run) { current = next; setRun(next); }
  function clear() { timers.clear(); cancelAnimationFrame(frame); held = false; }
  function fitColumns() {
    const width = board?.clientWidth || 320;
    columns = Math.min(Math.max(2, Math.min(6, Math.floor((width + 14) / 62))), Math.max(2, Math.ceil(Math.sqrt(current.cards.length))));
    setColumnCount(columns);
  }
  function focusCard(index: number) {
    setCursor(index);
    const target = cards.get(index);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function focusAfterRender(action: () => void) {
    timers.after(() => { if (!disposed && !document.hidden) action(); }, 0);
  }
  function retry() {
    clear(); cards.clear(); update(initialRun()); setCursor(0); fitColumns();
    focusAfterRender(() => { if (current.phase === 'study') ready?.focus({ preventScroll: true }); });
  }
  function accepts(event: Event) {
    if (disposed || document.hidden) return false;
    const kind = inputKind(event);
    if (current.input && current.input !== kind) {
      update({ ...current, message: `Use ${current.input} for this run. Restart to switch.` });
      return false;
    }
    return true;
  }
  function hide(event: Event) {
    if (current.phase !== 'study' || !accepts(event)) return;
    const input = inputKind(event);
    props.onScopeChange?.(`pairs-v4-${input}`);
    update({ ...current, phase: 'conceal', input, open: [], message: 'Cards turning over.' });
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
      open: current.cards.map(card => card.index), message: 'No lives left. Review the last mismatch.' });
    setCursor(lastMismatch[0]);
    if (current.input === 'keyboard') focusAfterRender(() => focusCard(lastMismatch[0]));
    props.onFinish(result);
  }
  function pick(index: number, event: Event) {
    if (current.phase !== 'ready' || !accepts(event) || current.open.includes(index) || current.matched.includes(index)) return;
    const first = current.first;
    const next: Run = { ...current, open: [...current.open, index], first: index, message: 'Find its matching card.' };
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
        update({ ...current, round, cards: nextCards, phase: 'study', open: nextCards.map(card => card.index), matched: [], mismatch: [], message: 'Study the new cards for as long as you like.' });
        setCursor(0); fitColumns();
        if (current.input === 'keyboard') focusAfterRender(() => ready?.focus({ preventScroll: true }));
      }, 700);
      return;
    }
    update(next);
  }
  function cancel() {
    if (disposed || current.phase === 'finished' || current.phase === 'cancelled') return;
    clear(); update({ ...current, phase: 'cancelled', message: 'Run interrupted. This unfinished run was not scored.' });
  }
  function keydown(event: KeyboardEvent) {
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
    window.addEventListener('blur', cancel);
    window.addEventListener('pagehide', cancel);
    window.addEventListener('keyup', keyup);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      observer.disconnect(); window.removeEventListener('blur', cancel); window.removeEventListener('pagehide', cancel);
      window.removeEventListener('keyup', keyup); document.removeEventListener('visibilitychange', visibility);
    };
  });
  onCleanup(() => { disposed = true; clear(); });

  return <section class="pair-memory" onKeyDown={keydown} aria-label="Pair memory">
    <Show when={run().phase !== 'finished' && run().phase !== 'cancelled'}>
      <Stats items={[{ label: 'Round', value: run().round + 1 }, { label: 'Pairs left', value: (run().cards.length - run().matched.length) / 2 }, { label: 'Lives', value: run().lives, lives: true }]}/>
    </Show>
    <p class="pair-status-line" aria-live="polite">{run().message}</p>
    <Show when={run().result}>{result => <Result result={result()} onRetry={retry}>
      <p>{run().matches} pairs matched &middot; reached round {run().round + 1}</p>
      <p>Crossed cards are your picks. Pair the matching numbers.</p>
    </Result>}</Show>
    <Show when={run().phase === 'cancelled'}><Button class="pair-replay" onClick={retry}><Redo2 size={18}/>Play again</Button></Show>
    <div ref={board} class={['pair-board', run().phase === 'finished' && 'is-review']}
      hidden={run().phase === 'cancelled'} role="group" aria-label="Matching cards. Use arrow keys to move between cards."
      style={{ '--pair-columns': columnCount() } as JSX.CSSProperties}>
      <For each={run().cards}>{card => <button ref={element => { cards.set(card.index, element); }}
        type="button" class={['pair-card', run().open.includes(card.index) && 'is-open', run().matched.includes(card.index) && 'is-matched']} data-pair-index={card.index}
        data-review={review(card)?.picked ? 'picked' : review(card) ? 'counterpart' : undefined}
        data-review-pair={review(card)?.number}
        disabled={run().phase === 'study' || run().phase === 'conceal'}
        aria-disabled={run().phase !== 'ready' || run().open.includes(card.index) ? 'true' : 'false'}
        aria-label={label(card)} tabindex={cursor() === card.index ? 0 : -1}
        onFocus={() => setCursor(card.index)}
        onPointerDown={event => {
          if (!presses.down(event) || current.phase !== 'ready') return;
          focusCard(card.index); pick(card.index, event);
        }}
        onClick={event => { event.preventDefault(); if (!held && presses.click(event)) pick(card.index, event); }}>
        <span class="pair-face" aria-hidden="true">
          <Show when={card.object.svg} fallback={card.object.name}>
            <svg xmlns="http://www.w3.org/2000/svg" class="pair-object" viewBox={card.object.viewBox} aria-hidden="true" innerHTML={card.artwork}/>
          </Show>
        </span>
        <Show when={review(card)}>{marker => <span class="pair-review-marker" aria-hidden="true">{marker().number}<Show when={marker().picked}><X size={11}/></Show></span>}</Show>
        <Show when={run().matched.includes(card.index)}><span class="pair-matched-marker" aria-hidden="true"><Check size={13}/></span></Show>
      </button>}</For>
    </div>
    <Show when={run().phase === 'study' || run().phase === 'conceal'}>
      <div class="pair-actions"><Button ref={ready} class="pair-ready ai-primary" data-pair-ready="true" disabled={run().phase === 'conceal'} onClick={event => { if (!held) hide(event); }}><CirclePlay size={18}/>Hide cards &amp; start</Button></div>
    </Show>
  </section>;
}
