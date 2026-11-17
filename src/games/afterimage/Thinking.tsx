import { For, Match, Show, Switch, createSignal, onCleanup, onSettled } from 'solid-js';
import { Button } from '../../shared/components/Button.tsx';
import { topLayer } from '../../shared/overlay.ts';
import { ChevronRight as ArrowRight, Delete } from '../../shared/components/Icons.tsx';
import { Ready, Result, Stats, useGameContextMenu, useGameLayerInterrupt, useGamePress, useTimers } from './common.tsx';
import { GameRules } from './GameRules.tsx';
import { ActiveCountdown } from './active-clock.ts';
import type { GameProps, GameResult } from './types.ts';
import { arithmeticPoints, colorNames, createQuestionFactory, inkColors, points, protocol, rotation, type Question, type RotationQuestion, type ThinkingMode } from './thinking-core.ts';
import type { Cell } from './thinking-shapes.ts';
import { arrowDirection, rotationDescription } from './thinking-description.ts';
import './thinking.css';

function Shape(props: { name: string; cells: readonly Cell[]; angle: number; mirrored?: boolean }) {
  const width = () => Math.max(...props.cells.map(([x]) => x)) + 1;
  const height = () => Math.max(...props.cells.map(([, y]) => y)) + 1;
  return <svg viewBox="0 0 120 120" role="img" aria-label={`${props.name} shape. ${rotationDescription(props.cells, props.angle, props.mirrored)}`}><g transform={`translate(60 60) rotate(${props.angle}) scale(${props.mirrored ? -1 : 1} 1)`} fill="currentColor"><For each={props.cells}>{([x, y]) => <rect x={(x - width() / 2) * 16} y={(y - height() / 2) * 16} width="16" height="16"/>}</For></g></svg>;
}
function RotationView(props: { question: RotationQuestion }) {
  return <div class="ai-thinking-shapes"><figure><Shape name="Original" cells={props.question.original} angle={props.question.referenceAngle}/><figcaption>Original</figcaption></figure><figure><Shape name="Compare" cells={props.question.comparison} angle={props.question.referenceAngle + props.question.angle} mirrored={props.question.mirrored}/><figcaption>Compare</figcaption></figure></div>;
}
function Arrow(props: { angle: number }) {
  return <svg viewBox="0 0 120 120" aria-hidden="true"><g transform={`translate(60 60) rotate(${props.angle})`}><path d="M-30-9H8V-26L34 0 8 26V9H-30Z" fill="currentColor"/></g></svg>;
}
function Prompt(props: { question: Question }) {
  const sequence = () => props.question.type === 'patterns' ? props.question.values : [];
  const word = () => props.question.type === 'stroop' ? colorNames[props.question.printed].toUpperCase() : '';
  const ink = () => props.question.type === 'stroop' ? inkColors[props.question.correct] : '';
  const inkName = () => props.question.type === 'stroop' ? colorNames[props.question.correct] : '';
  const equation = () => props.question.type === 'arithmetic' ? `${props.question.a} ${props.question.operator} ${props.question.b}` : '';
  return <Switch>
    <Match when={props.question.type === 'rotation'}><RotationView question={props.question as RotationQuestion}/></Match>
    <Match when={props.question.type === 'patterns'}><p class="ai-thinking-sequence"><For each={sequence()}>{value => <><span>{value}</span><span aria-hidden="true">→</span></>}</For><span>?</span></p></Match>
    <Match when={props.question.type === 'stroop'}><p class="ai-thinking-word" role="img" aria-label={`Printed word: ${word()}. Ink colour: ${inkName()}.`} style={{ color: ink() }}>{word()}</p></Match>
    <Match when={props.question.type === 'arithmetic'}><p class="ai-thinking-equation">{equation()}</p></Match>
  </Switch>;
}
type Run = { phase: 'ready' | 'running' | 'answered' | 'between' | 'result'; question: Question; correct: number; errors: number; score: number; round: number; remaining: number; feedback: string; selected: number; result: GameResult | null };

export function ThinkingGame(props: GameProps) {
  const mode = props.id as ThinkingMode;
  const rules = protocol(mode);
  let factory = createQuestionFactory(mode);
  let state: Run = { phase: 'ready', question: mode === 'rotation' ? rotation(0, 1, () => 0.2) : factory(0), correct: 0, errors: 0, score: 0, round: 0, remaining: rules.duration, feedback: '', selected: -1, result: null };
  const [view, setView] = createSignal(state);
  const [entry, setEntry] = createSignal('');
  const [searchFocus, setSearchFocus] = createSignal(0);
  const timers = useTimers();
  const presses = useGamePress();
  const clock = new ActiveCountdown();
  let root!: HTMLDivElement, input: HTMLInputElement | undefined;
  const ownsFocus = () => !document.hidden && !topLayer() && (document.activeElement === document.body || root.contains(document.activeElement));
  const held = new Set<string>();
  function updateEntry(value: string) {
    setEntry(value);
    if (input) input.value = value;
  }
  function enter(key: string) {
    if (state.phase !== 'running' || document.hidden || topLayer()) return;
    const current = input?.value ?? entry();
    const value = key === 'Delete' ? current.slice(0, -1) : key === '−' ? current.startsWith('-') ? current.slice(1) : `-${current}` : `${current}${key}`.slice(0, 8);
    updateEntry(value); input?.focus({ preventScroll: true });
  }
  function update(next: Partial<Run>) { state = { ...state, ...next }; setView(state); }
  const live = () => ['running', 'answered', 'between'].includes(state.phase);
  function finish() {
    if (!live()) return;
    timers.clear(); clock.reset();
    const result: GameResult = { value: state.score, scope: rules.scope, unit: 'points', details: { correct: state.correct, errors: state.errors, rounds: state.correct + state.errors, accuracy: `${state.correct + state.errors ? Math.round(state.correct * 100 / (state.correct + state.errors)) : 0}%`, elapsed: rules.duration * 1000, duration: rules.duration, rulesVersion: mode === 'rotation' || mode === 'patterns' ? 4 : mode === 'arithmetic' ? 1 : 2 } };
    update({ phase: 'result', remaining: 0, result });
    props.onFinish(result);
  }
  function tick() {
    if (!live() || !clock.running) return;
    const remaining = clock.remaining(performance.now());
    if (remaining <= 0) { finish(); return; }
    update({ remaining: Math.ceil(remaining / 1000) });
    timers.after(tick, Math.min(100, remaining));
  }
  function focusAnswer(index = 0) {
    timers.after(() => {
      if (state.phase !== 'running' || !ownsFocus()) return;
      if (mode === 'arithmetic') input?.focus({ preventScroll: true });
      else root.querySelector<HTMLButtonElement>(`[data-answer="${index}"]`)?.focus({ preventScroll: true });
    }, 0);
  }
  function start() {
    if (document.hidden || topLayer()) return;
    timers.clear(); held.clear(); factory = createQuestionFactory(mode);
    clock.start(rules.duration * 1000, performance.now());
    updateEntry(''); setSearchFocus(0);
    update({ phase: 'running', question: factory(0), correct: 0, errors: 0, score: 0, round: 0, remaining: rules.duration, feedback: '', selected: -1, result: null });
    props.onActivityChange?.(true);
    tick(); focusAnswer();
  }
  function next(keepFeedback = false, focus = 0) {
    if (!['answered', 'between'].includes(state.phase) || document.hidden || topLayer()) return;
    if (state.phase === 'answered' && (state.phase !== view().phase || state.question !== view().question)) return;
    const now = performance.now();
    if (clock.remaining(now) <= 0) { finish(); return; }
    const paused = !clock.running;
    clock.resume(now);
    const round = state.round + 1;
    updateEntry('');
    update({ phase: 'running', question: factory(round), round, selected: -1, feedback: keepFeedback ? state.feedback : '' });
    if (paused) tick();
    if (mode !== 'stroop') focusAnswer(focus);
  }
  function answer(value: number) {
    if (state.phase !== 'running' || document.hidden || topLayer() || state.question !== view().question) return;
    const now = performance.now();
    if (clock.remaining(now) <= 0) { finish(); return; }
    const question = state.question;
    const good = value === (question.type === 'arithmetic' ? question.answer : question.correct);
    const correct = state.correct + Number(good), errors = state.errors + Number(!good);
    const score = mode === 'arithmetic' ? arithmeticPoints(state.score, good) : points(correct, errors);
    const feedback = question.type === 'patterns' ? `${question.rule}. Next: ${question.answer}.`
      : question.type === 'rotation' ? good ? 'Correct +1' : question.correct === 2 ? 'Changed shape: one square moved.' : question.mirrored ? 'Mirrored: rotation alone cannot match it.' : 'Same shape: only its rotation changed.'
      : good ? 'Correct +1' : question.type === 'arithmetic' ? `Answer: ${question.answer}` : question.type === 'stroop' ? `Ink colour was ${colorNames[question.correct]}` : 'Wrong −1';
    const manual = mode === 'rotation' || mode === 'patterns';
    const focused = document.activeElement instanceof HTMLElement ? Number(document.activeElement.dataset.answer ?? 0) : 0;
    if (manual && !good) { clock.pause(now); timers.clear(); }
    update({ correct, errors, score, feedback, selected: value, remaining: Math.ceil(clock.remaining(now) / 1000), phase: manual ? 'answered' : 'between' });
    if (manual) timers.after(() => { if (ownsFocus()) root.querySelector<HTMLButtonElement>('[data-next]')?.focus({ preventScroll: true }); }, 0);
    else timers.after(() => next(true, focused), 0);
  }
  function submit() { const value = input?.value ?? entry(); if (/^-?\d+$/.test(value)) answer(Number(value)); }
  const labels = () => {
    const question = view().question;
    if (question.type === 'rotation') return ['Same shape', 'Mirrored shape', 'Changed shape'];
    if (question.type === 'patterns') return question.options.map(String);
    if (question.type === 'stroop') return colorNames;
    if (question.type === 'search') return question.angles.map((angle, i) => `Row ${Math.floor(i / 4) + 1}, column ${i % 4 + 1}, arrow pointing ${arrowDirection(angle)}`);
    return [];
  };
  const answerState = (index: number) => {
    const current = view(), question = current.question;
    return current.phase !== 'answered' ? undefined : question.type !== 'arithmetic' && index === question.correct ? 'correct' : index === current.selected ? 'wrong' : undefined;
  };
  function keys(event: KeyboardEvent) {
    if (!live() || document.hidden || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.isComposing || topLayer()) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target || !root.contains(target)) return;
    if (mode === 'arithmetic') {
      if (event.repeat && event.key === 'Enter') event.preventDefault();
      return;
    }
    if (target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    if (['Enter', ' '].includes(event.key) && target && root.contains(target) && target.tagName === 'BUTTON') {
      event.preventDefault();
      if (event.repeat || held.has(event.key)) return;
      held.add(event.key);
      if (target.hasAttribute('data-next') && state.phase === 'answered') next();
      else if (target.dataset.answer !== undefined) answer(Number(target.dataset.answer));
      return;
    }
    if (mode !== 'search' && /^[1-4]$/.test(event.key)) {
      event.preventDefault();
      if (!event.repeat && Number(event.key) <= labels().length) answer(Number(event.key) - 1);
    }
    if (mode === 'search' && state.phase === 'running' && target?.dataset.answer !== undefined && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const i = Number(target.dataset.answer), row = Math.floor(i / 4), col = i % 4;
      const nextIndex = event.key === 'ArrowLeft' ? row * 4 + (col + 3) % 4 : event.key === 'ArrowRight' ? row * 4 + (col + 1) % 4 : event.key === 'ArrowUp' ? (row + 3) % 4 * 4 + col : (row + 1) % 4 * 4 + col;
      setSearchFocus(nextIndex); focusAnswer(nextIndex);
    }
  }
  function release(event: KeyboardEvent) { held.delete(event.key); }
  function blur() { held.clear(); }
  function interrupt() {
    if (live()) {
      timers.clear(); clock.reset(); held.clear(); updateEntry(''); setSearchFocus(0);
      update({ phase: 'ready', question: factory(0), correct: 0, errors: 0, score: 0, round: 0, selected: -1, result: null, feedback: 'Run interrupted. Start a fresh run.', remaining: rules.duration });
      props.onActivityChange?.(false);
    }
  }
  function visibility() { if (document.hidden) interrupt(); }
  useGameLayerInterrupt(interrupt);
  onSettled(() => {
    props.onActivityChange?.(false);
    document.addEventListener('keydown', keys); document.addEventListener('keyup', release); document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', blur);
  });
  onCleanup(() => { document.removeEventListener('keydown', keys); document.removeEventListener('keyup', release); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur); });
  const instructions = {
    rotation: 'Compare the shapes: Same means a rotation can match them; Mirrored needs a flip; Changed has a square moved.',
    patterns: 'Work out the number pattern and choose the next number.',
    search: 'Select the arrow pointing a different way. Arrow keys move; Enter chooses.',
    stroop: 'Choose the colour of the letters, ignoring what the word says. A red BLUE means choose Red.',
    arithmetic: 'Enter the answer, then press Enter or Answer. Use − for a negative answer.',
  }[mode];
  const scoring = mode === 'arithmetic' ? 'Correct +1; wrong −1, never below 0.' : 'Score is correct answers minus mistakes, minimum 0.';
  const instructionDetail = `${scoring}${mode === 'rotation' || mode === 'patterns' ? ' Choose Next after each answer. The clock pauses after mistakes until you continue.' : ''}`;
  const playing = () => ['running', 'answered', 'between'].includes(view().phase);
  let playArea: HTMLDivElement | undefined;
  useGameContextMenu(() => playArea, live);
  return <div ref={root} class="ai-thinking" data-mode={mode} data-state={view().phase}>
    <Stats items={[{ label: 'Time', value: `${view().remaining}s` }, { label: 'Score', value: view().score }, ...(mode === 'arithmetic' ? [] : [{ label: 'Mistakes', value: view().errors }])]}/>
    <div class="ai-thinking-stage">
      <div ref={playArea} class="ai-thinking-play" data-game-input={playing() ? '' : undefined} inert={!playing()} aria-hidden={!playing() ? 'true' : undefined}>
        <p class="ai-thinking-feedback" role="status"><Show when={mode === 'patterns' && view().phase === 'answered'}><span class="ai-sr-only">{answerState(view().selected) === 'correct' ? 'Correct. ' : 'Incorrect. '}</span></Show><span class={{ 'ai-sr-only': mode === 'rotation' && view().phase === 'answered' && answerState(view().selected) === 'correct' }}>{view().feedback || undefined}</span></p>
        <div class="ai-thinking-prompt"><Prompt question={view().question}/></div>
        <Show when={mode === 'arithmetic'} fallback={<div class={['ai-thinking-answers', mode === 'search' && 'ai-thinking-search']}>
          <For each={labels()}>{(label, index) => <div class="ai-thinking-answer-slot">
            <Button data-answer={index()} aria-label={mode === 'search' ? label : `${label}, key ${index() + 1}`} data-outcome={answerState(index())} disabled={view().phase === 'answered'} tabindex={mode === 'search' && searchFocus() !== index() ? -1 : 0}
              style={mode === 'stroop' ? { '--answer-ink': inkColors[index()] } : undefined}
              onPointerDown={event => { if (state.phase !== 'running' || !presses.down(event)) return; event.currentTarget.focus({ preventScroll: true }); if (mode === 'search') setSearchFocus(index()); answer(index()); }}
              onClick={event => { if (presses.click(event)) answer(index()); }}>
              <Show when={mode === 'search'} fallback={<><kbd aria-hidden="true">{index() + 1}</kbd><span>{label}</span></>}><Arrow angle={view().question.type === 'search' ? (view().question as { angles: number[] }).angles[index()] : 0}/></Show>
            </Button>
            <Show when={view().phase === 'answered' && view().selected === index()}><Button class="ai-thinking-next ai-primary" data-next data-outcome={answerState(index())} aria-label="Next question" onPointerDown={event => { if (state.phase === 'answered' && presses.down(event)) next(); }} onClick={event => { if (state.phase === 'answered' && presses.click(event)) next(); }}><span>Next</span><ArrowRight size={18}/></Button></Show>
          </div>}</For>
        </div>}>
          <form class="ai-thinking-math" onSubmit={event => { event.preventDefault(); submit(); }}>
            <label for="ai-thinking-entry">Your answer</label><div class="ai-thinking-entry"><input id="ai-thinking-entry" ref={input} type="text" inputmode="none" autocomplete="off" value={entry()} onInput={event => updateEntry(event.currentTarget.value.replace(/[^\d-]/g, '').slice(0, 8))}/><Button type="submit" class="ai-primary">Answer<ArrowRight size={18}/></Button></div>
            <div class="ai-thinking-keypad"><For each={['1', '2', '3', '4', '5', '6', '7', '8', '9', '−', '0', 'Delete']}>{key => <Button aria-label={key === '−' ? 'Change sign' : key} onPointerDown={event => { if (state.phase === 'running' && presses.down(event)) enter(key); }} onClick={event => { if (state.phase === 'running' && presses.click(event)) enter(key); }}><Show when={key === 'Delete'} fallback={key}><Delete size={18}/></Show></Button>}</For></div>
          </form>
        </Show>
      </div>
      <Show when={view().phase === 'ready'}><Ready overlay onStart={start} rules={<GameRules detail={instructionDetail}>{instructions}</GameRules>}><p role="status">{view().feedback || undefined}</p></Ready></Show>
      <Show when={view().result} keyed>{result => <Result overlay result={result} onRetry={start}/>}</Show>
    </div>
  </div>;
}
