import { createEffect, createSignal, For, onSettled, Show } from 'solid-js';
import { Dynamic } from '@solidjs/web';
import { Button } from '../../shared/components/Button.tsx';
import { Check, X } from '../../shared/components/Icons.tsx';
import { Ready, Result, Stats, useGamePress, useTimers } from './common.tsx';
import type { ChallengeDefinition, ChallengeQuestion } from './challenge-types.ts';
import type { GameProps, GameResult } from './types.ts';
import './challenges.css';

type Phase = 'ready' | 'answer' | 'wrong' | 'correct' | 'result';
type Run<Q> = { phase: Phase; question: Q; round: number; correct: number; errors: number; selected: number; remaining: number; result: GameResult | null; explanation: string };
const duration = 60;

export function ChallengeGame<Q extends ChallengeQuestion>(props: GameProps & { definition: ChallengeDefinition<Q> }) {
  const definition = props.definition;
  const scope = `${definition.id}-v1-60s`;
  const timers = useTimers();
  const presses = useGamePress();
  const heldKeys = new Set<string>();
  const buttons = new Map<number, HTMLButtonElement>();
  let state: Run<Q> = { phase: 'ready', question: definition.createQuestion(0), round: 0, correct: 0, errors: 0, selected: -1, remaining: duration, result: null, explanation: '' };
  const [view, setView] = createSignal(state);
  const [notice, setNotice] = createSignal('');
  let deadline = 0;
  function update(next: Partial<Run<Q>>) { state = { ...state, ...next }; setView(state); }
  const live = () => ['answer', 'wrong', 'correct'].includes(state.phase);
  const score = () => Math.max(0, view().correct - view().errors);
  function finish() {
    if (!live()) return;
    timers.clear();
    const result: GameResult = { value: Math.max(0, state.correct - state.errors), scope, unit: 'points', details: { correct: state.correct, errors: state.errors, rounds: state.correct + state.errors, duration, rulesVersion: 1 } };
    update({ phase: 'result', remaining: 0, result });
    setNotice('Run finished.');
    props.onFinish(result);
  }
  function tick() {
    if (!live()) return;
    const remaining = deadline - performance.now();
    if (remaining <= 0) { finish(); return; }
    const seconds = Math.ceil(remaining / 1000);
    if (state.remaining !== seconds) update({ remaining: seconds });
    timers.after(tick, Math.min(100, remaining));
  }
  function start() {
    timers.clear(); heldKeys.clear();
    deadline = performance.now() + duration * 1000;
    update({ phase: 'answer', question: definition.createQuestion(0), round: 0, correct: 0, errors: 0, selected: -1, remaining: duration, result: null, explanation: '' });
    setNotice(''); props.onActivityChange?.(false); props.onScopeChange?.(scope);
    tick();
    timers.after(() => { if (state.phase === 'answer') buttons.get(0)?.focus({ preventScroll: true }); }, 0);
  }
  function advance() {
    update({ phase: 'correct', explanation: '' });
    timers.after(() => {
      if (!live() || document.hidden) return;
      if (performance.now() >= deadline) { finish(); return; }
      const round = state.round + 1;
      update({ phase: 'answer', question: definition.createQuestion(round), round, selected: -1, explanation: '' });
    }, 220);
  }
  function answer(index: number) {
    // A scored answer and its correction must each follow a rendered state.
    if (document.hidden || !live() || state.question !== view().question || state.phase !== view().phase || state.phase === 'correct') return false;
    if (performance.now() >= deadline) { finish(); return false; }
    if (state.phase === 'wrong') {
      if (index !== state.question.correct) return false;
      setNotice('Correct answer. Next question.'); advance(); return true;
    }
    props.onActivityChange?.(true);
    const correct = index === state.question.correct;
    update({ correct: state.correct + Number(correct), errors: state.errors + Number(!correct), selected: index });
    if (correct) { setNotice('Correct.'); advance(); }
    else { setNotice(`Incorrect. ${state.question.explanation}`); update({ phase: 'wrong', explanation: state.question.explanation }); }
    return true;
  }
  const blocked = (index: number) => view().phase === 'wrong' ? index !== view().question.correct : view().phase !== 'answer';
  const outcome = (index: number) => (view().phase === 'result' || ['wrong', 'correct'].includes(view().phase) && view().selected >= 0) ? index === view().question.correct ? 'correct' : index === view().selected ? 'wrong' : undefined : undefined;
  function keys(event: KeyboardEvent) {
    if (!live() || document.hidden || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-challenge-choice]') : null;
    if (!target) return;
    const index = Number(target.dataset.challengeChoice);
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const offset = event.key === 'ArrowLeft' ? 3 : event.key === 'ArrowRight' ? 1 : 2;
      const next = (index + offset) % 4;
      if (!buttons.get(next)?.disabled) buttons.get(next)?.focus({ preventScroll: true });
      return;
    }
    if (!['Enter', ' ', '1', '2', '3', '4'].includes(event.key)) return;
    event.preventDefault();
    if (event.repeat || heldKeys.has(event.key)) return;
    heldKeys.add(event.key);
    const selected = /^[1-4]$/.test(event.key) ? Number(event.key) - 1 : index;
    if (!blocked(selected) && answer(selected)) buttons.get(selected)?.focus({ preventScroll: true });
  }
  createEffect(() => view().phase, phase => { if (phase === 'wrong') buttons.get(state.question.correct)?.focus({ preventScroll: true }); });
  onSettled(() => {
    props.onActivityChange?.(false);
    const release = (event: KeyboardEvent) => heldKeys.delete(event.key);
    const blur = () => heldKeys.clear();
    const visibility = () => {
      if (!document.hidden || !live()) return;
      timers.clear(); heldKeys.clear();
      update({ phase: 'ready', remaining: duration, correct: 0, errors: 0, selected: -1, result: null, explanation: '' });
      setNotice('Run interrupted. Start a fresh run.'); props.onActivityChange?.(false);
    };
    window.addEventListener('keyup', release); window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('keyup', release); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility); };
  });
  return <div class="ai-challenge" data-challenge={definition.id} data-phase={view().phase} onKeyDown={keys}>
    <Stats items={[{ label: 'Time', value: `${view().remaining}s` }, { label: 'Score', value: score() }, { label: 'Mistakes', value: view().errors }]}/>
    <span class="ai-sr-only" role="status">{view().phase !== 'ready' ? notice() || undefined : undefined}</span>
    <div class="ai-challenge-stage">
      <div class="ai-challenge-play" inert={view().phase === 'ready'} aria-hidden={view().phase === 'ready' ? 'true' : undefined}>
        <div class="ai-challenge-prompt"><Dynamic component={definition.Prompt} question={view().question}/></div>
        <div class="ai-challenge-options"><For each={[0, 1, 2, 3]}>{index => <Button ref={element => { buttons.set(index, element); }} class="ai-challenge-option" data-challenge-choice={index} data-outcome={outcome(index)} aria-label={`${view().question.options[index]}, key ${index + 1}`} aria-disabled={blocked(index) ? 'true' : undefined} disabled={view().phase === 'result' || view().phase === 'wrong' && index !== view().question.correct}
          onPointerDown={event => { if (!blocked(index) && presses.down(event) && answer(index)) event.currentTarget.focus({ preventScroll: true }); }} onClick={event => { if (!blocked(index) && presses.click(event)) answer(index); }}>
          <span class="ai-challenge-choice-key" aria-hidden="true">{index + 1}</span>
          <span class="ai-challenge-option-content"><Show when={definition.Option} fallback={view().question.options[index]}>{Option => <Dynamic component={Option()} question={view().question} index={index}/>}</Show></span>
          <span class="ai-challenge-outcome" aria-hidden="true"><Show when={outcome(index) === 'correct'}><Check size={18}/></Show><Show when={outcome(index) === 'wrong'}><X size={18}/></Show></span>
        </Button>}</For></div>
      </div>
      <Show when={view().phase === 'ready'}><Ready overlay onStart={start}><p>{definition.instruction}</p><p>Score = correct − mistakes, minimum 0.</p><p role="status">{notice() || undefined}</p></Ready></Show>
      <Show when={view().result} keyed>{result => <Result overlay result={result} onRetry={start}/>}</Show>
    </div>
    <div class="ai-challenge-explanation">{view().explanation || undefined}</div>
  </div>;
}
