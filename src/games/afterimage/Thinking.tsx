import { For, Match, Show, Switch, createSignal, onCleanup, onSettled } from 'solid-js';
import { Button } from '../../shared/components/Button.tsx';
import { ChevronRight as ArrowRight, Undo2 as Delete } from '../../shared/components/Icons.tsx';
import { Ready, Result, Stats, useTimers } from './common.tsx';
import type { GameProps, GameResult } from './types.ts';
import { acceptsAnswer, arithmeticPoints, colorNames, createQuestionFactory, inkColors, points, protocol, rotation, secondsLeft, type Question, type RotationQuestion, type ThinkingMode } from './thinking-core.ts';
import type { Cell } from './thinking-shapes.ts';
import './thinking.css';

function Shape(props: { cells: readonly Cell[]; angle: number; mirrored?: boolean }) {
  const width = () => Math.max(...props.cells.map(([x]) => x)) + 1;
  const height = () => Math.max(...props.cells.map(([, y]) => y)) + 1;
  return <svg viewBox="0 0 120 120" role="img" aria-label="Eight-square shape"><g transform={`translate(60 60) rotate(${props.angle}) scale(${props.mirrored ? -1 : 1} 1)`} fill="currentColor"><For each={props.cells}>{([x, y]) => <rect x={(x - width() / 2) * 16} y={(y - height() / 2) * 16} width="16" height="16"/>}</For></g></svg>;
}
function RotationView(props: { question: RotationQuestion }) {
  return <div class="ai-thinking-shapes"><figure><Shape cells={props.question.original} angle={props.question.referenceAngle}/><figcaption>Original</figcaption></figure><figure><Shape cells={props.question.comparison} angle={props.question.referenceAngle + props.question.angle} mirrored={props.question.mirrored}/><figcaption>Compare</figcaption></figure></div>;
}
function Arrow(props: { angle: number }) {
  return <svg viewBox="0 0 120 120" aria-hidden="true"><g transform={`translate(60 60) rotate(${props.angle})`}><path d="M-30-9H8V-26L34 0 8 26V9H-30Z" fill="currentColor"/></g></svg>;
}
function Prompt(props: { question: Question }) {
  const sequence = () => props.question.type === 'patterns' ? props.question.values : [];
  const word = () => props.question.type === 'stroop' ? colorNames[props.question.printed].toUpperCase() : '';
  const ink = () => props.question.type === 'stroop' ? inkColors[props.question.correct] : '';
  const equation = () => props.question.type === 'arithmetic' ? `${props.question.a} ${props.question.operator} ${props.question.b}` : '';
  return <Switch>
    <Match when={props.question.type === 'rotation'}><RotationView question={props.question as RotationQuestion}/></Match>
    <Match when={props.question.type === 'patterns'}><p class="ai-thinking-sequence"><For each={sequence()}>{value => <><span>{value}</span><span aria-hidden="true">→</span></>}</For><span>?</span></p></Match>
    <Match when={props.question.type === 'stroop'}><p class="ai-thinking-word" style={{ color: ink() }}>{word()}</p></Match>
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
  let deadline = 0, root!: HTMLDivElement, input: HTMLInputElement | undefined;
  const held = new Set<string>();
  function update(next: Partial<Run>) { state = { ...state, ...next }; setView(state); }
  const live = () => ['running', 'answered', 'between'].includes(state.phase);
  function finish() {
    if (!live()) return;
    timers.clear();
    const result: GameResult = { value: state.score, scope: rules.scope, unit: 'points', details: { correct: state.correct, errors: state.errors, rounds: state.correct + state.errors, accuracy: `${state.correct + state.errors ? Math.round(state.correct * 100 / (state.correct + state.errors)) : 0}%`, elapsed: rules.duration * 1000, duration: rules.duration, rulesVersion: mode === 'rotation' || mode === 'patterns' ? 3 : mode === 'arithmetic' ? 1 : 2 } };
    update({ phase: 'result', remaining: 0, result });
    props.onFinish(result);
  }
  function tick() {
    if (!live()) return;
    const now = performance.now();
    if (!acceptsAnswer(deadline, now)) { finish(); return; }
    update({ remaining: secondsLeft(deadline, now) });
    timers.after(tick, Math.min(100, deadline - now));
  }
  function focusAnswer(index = 0) {
    timers.after(() => {
      if (state.phase !== 'running') return;
      if (mode === 'arithmetic') input?.focus({ preventScroll: true });
      else root.querySelector<HTMLButtonElement>(`[data-answer="${index}"]`)?.focus({ preventScroll: true });
    }, 0);
  }
  function start() {
    timers.clear(); held.clear(); factory = createQuestionFactory(mode);
    deadline = performance.now() + rules.duration * 1000;
    setEntry(''); setSearchFocus(0);
    update({ phase: 'running', question: factory(0), correct: 0, errors: 0, score: 0, round: 0, remaining: rules.duration, feedback: '', selected: -1, result: null });
    tick(); focusAnswer();
  }
  function next(keepFeedback = false, focus = 0) {
    if (!live() || document.hidden) return;
    if (!acceptsAnswer(deadline, performance.now())) { finish(); return; }
    const round = state.round + 1;
    setEntry('');
    update({ phase: 'running', question: factory(round), round, selected: -1, feedback: keepFeedback ? state.feedback : '' });
    if (mode !== 'stroop') focusAnswer(focus);
  }
  function answer(value: number) {
    if (state.phase !== 'running' || document.hidden) return;
    if (!acceptsAnswer(deadline, performance.now())) { finish(); return; }
    const question = state.question;
    const good = value === (question.type === 'arithmetic' ? question.answer : question.correct);
    const correct = state.correct + Number(good), errors = state.errors + Number(!good);
    const score = mode === 'arithmetic' ? arithmeticPoints(state.score, good) : points(correct, errors);
    const feedback = question.type === 'patterns' ? `${good ? 'Correct.' : 'Incorrect.'} ${question.rule}. Next: ${question.answer}.`
      : question.type === 'rotation' ? good ? 'Correct +1' : question.correct === 2 ? 'Changed shape: one square moved.' : question.mirrored ? 'Mirrored: rotation alone cannot match it.' : 'Same shape: only its rotation changed.'
      : good ? 'Correct +1' : question.type === 'arithmetic' ? `Answer: ${question.answer}` : question.type === 'stroop' ? `Ink colour was ${colorNames[question.correct]}` : 'Wrong −1';
    const manual = mode === 'rotation' || mode === 'patterns';
    const focused = document.activeElement instanceof HTMLElement ? Number(document.activeElement.dataset.answer ?? 0) : 0;
    update({ correct, errors, score, feedback, selected: value, phase: manual ? 'answered' : 'between' });
    if (manual) timers.after(() => root.querySelector<HTMLButtonElement>('[data-next]')?.focus({ preventScroll: true }), 0);
    else timers.after(() => next(true, focused), 0);
  }
  function submit() { const value = input?.value ?? entry(); if (/^-?\d+$/.test(value)) answer(Number(value)); }
  const labels = () => {
    const question = view().question;
    if (question.type === 'rotation') return ['Same shape', 'Mirrored shape', 'Changed shape'];
    if (question.type === 'patterns') return question.options.map(String);
    if (question.type === 'stroop') return colorNames;
    if (question.type === 'search') return question.angles.map((_, i) => `Row ${Math.floor(i / 4) + 1}, column ${i % 4 + 1}`);
    return [];
  };
  const answerState = (index: number) => {
    const current = view(), question = current.question;
    return current.phase !== 'answered' ? undefined : question.type !== 'arithmetic' && index === question.correct ? 'correct' : index === current.selected ? 'wrong' : undefined;
  };
  function keys(event: KeyboardEvent) {
    if (!live() || document.hidden || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (mode === 'arithmetic') {
      if (event.repeat && event.key === 'Enter') event.preventDefault();
      return;
    }
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
  function visibility() {
    if (document.hidden && live()) { timers.clear(); held.clear(); update({ phase: 'ready', feedback: 'Run interrupted. Start a fresh run.', remaining: rules.duration }); }
  }
  onSettled(() => {
    document.addEventListener('keydown', keys); document.addEventListener('keyup', release); document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', blur);
  });
  onCleanup(() => { document.removeEventListener('keydown', keys); document.removeEventListener('keyup', release); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur); });
  const instructions = { rotation: 'Compare the eight-square shapes. Is the second rotated, mirrored, or changed? Use keys 1–3.', patterns: 'Find the next number. Use keys 1–4, then Next to continue.', search: 'Find the arrow pointing a different way. Use the arrow keys to move and Enter to choose.', stroop: 'Choose the ink colour, not the word. Tap a colour or press 1–4.', arithmetic: 'Solve additions, subtractions and multiplications. Negative answers are allowed.' }[mode];
  return <div ref={root} class="ai-thinking" data-mode={mode}>
    <Stats items={[{ label: 'Time', value: `${view().remaining}s` }, { label: 'Score', value: view().score }, ...(mode === 'arithmetic' ? [] : [{ label: 'Mistakes', value: view().errors }])]}/>
    <Show when={view().phase === 'ready'}><Ready onStart={start}><p>{instructions}</p><p>{rules.duration} seconds · {mode === 'arithmetic' ? 'Correct +1, wrong −1; score never falls below 0.' : 'Score: correct answers − mistakes, minimum 0.'}</p><Show when={mode === 'rotation'}><Prompt question={view().question}/></Show><p role="status">{view().feedback}</p></Ready></Show>
    <Show when={view().result} keyed>{result => <Result result={result} onRetry={start}><p>{view().correct} correct · {view().errors} mistakes · {rules.duration} seconds</p></Result>}</Show>
    <Show when={['running', 'answered', 'between'].includes(view().phase)}>
      <div class="ai-thinking-play">
        <p class="ai-thinking-feedback" role="status">{view().feedback || instructions}</p>
        <Prompt question={view().question}/>
        <Show when={mode === 'arithmetic'} fallback={<div class={['ai-thinking-answers', mode === 'search' && 'ai-thinking-search']}>
          <For each={labels()}>{(label, index) => <div class="ai-thinking-answer-slot">
            <Button data-answer={index()} aria-label={mode === 'search' ? label : `${label}, key ${index() + 1}`} data-outcome={answerState(index())} disabled={view().phase === 'answered'} tabindex={mode === 'search' && searchFocus() !== index() ? -1 : 0}
              style={mode === 'stroop' ? { '--answer-ink': inkColors[index()] } : undefined}
              onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); if (mode === 'search') setSearchFocus(index()); answer(index()); }}
              onClick={event => { if (event.detail === 0) answer(index()); }}>
              <Show when={mode === 'search'} fallback={<><kbd aria-hidden="true">{index() + 1}</kbd><span>{label}</span></>}><Arrow angle={view().question.type === 'search' ? (view().question as { angles: number[] }).angles[index()] : 0}/></Show>
            </Button>
            <Show when={view().phase === 'answered' && view().selected === index()}><Button class="ai-thinking-next ai-primary" data-next data-outcome={answerState(index())} aria-label="Next question" onClick={() => { if (state.phase === 'answered') next(); }}><span>Next</span><ArrowRight size={18}/></Button></Show>
          </div>}</For>
        </div>}>
          <form class="ai-thinking-math" onSubmit={event => { event.preventDefault(); submit(); }}>
            <label for="ai-thinking-entry">Your answer</label><div class="ai-thinking-entry"><input id="ai-thinking-entry" ref={input} type="text" inputmode="none" autocomplete="off" value={entry()} onInput={event => setEntry(event.currentTarget.value.replace(/[^\d-]/g, '').slice(0, 8))}/><Button type="submit" class="ai-primary">Answer<ArrowRight size={18}/></Button></div>
            <div class="ai-thinking-keypad"><For each={['1', '2', '3', '4', '5', '6', '7', '8', '9', '−', '0', 'Delete']}>{key => <Button aria-label={key === '−' ? 'Change sign' : key} onClick={() => {
              const current = input?.value ?? entry();
              const value = key === 'Delete' ? current.slice(0, -1) : key === '−' ? current.startsWith('-') ? current.slice(1) : `-${current}` : `${current}${key}`.slice(0, 8);
              setEntry(value); input?.focus({ preventScroll: true });
            }}><Show when={key === 'Delete'} fallback={key}><Delete size={18}/></Show></Button>}</For></div>
          </form>
        </Show>
      </div>
    </Show>
  </div>;
}
