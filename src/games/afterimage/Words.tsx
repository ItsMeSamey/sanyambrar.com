import { createSignal, For, onCleanup, onSettled, Show } from 'solid-js';
import { Button } from '../../shared/components/Button.tsx';
import { CornerDownLeft, Delete } from '../../shared/components/Icons.tsx';
import { Ready, Result, Stats, useResultGate, useTimers } from './common.tsx';
import type { GameProps, GameResult } from './types.ts';
import { typingPassages } from './words-data.ts';
import { applyTypingEdit, compareDigits, createWordDeck, makeNumber, numberRevealTime, typingMetrics, type PendingTypingEdit } from './words-logic.ts';
import './words.css';

type Phase = 'ready' | 'running' | 'result';

function onHidden(cancel: () => void) {
  const visibility = () => { if (document.hidden) cancel(); };
  onSettled(() => { document.addEventListener('visibilitychange', visibility); });
  onCleanup(() => document.removeEventListener('visibilitychange', visibility));
}

function NumberEntry(props: { length: number; onSubmit: (value: string) => void }) {
  const [value, setValue] = createSignal('');
  const [notice, setNotice] = createSignal('');
  let input!: HTMLInputElement, current = '', submitted = false;
  function update(next: string, caret: number) {
    current = next;
    setValue(next);
    input.value = next;
    input.focus({ preventScroll: true });
    input.setSelectionRange(caret, caret);
    if (caret === next.length) input.scrollLeft = input.scrollWidth;
  }
  function replace(text: string) {
    const start = input.selectionStart ?? current.length, end = input.selectionEnd ?? start;
    const next = current.slice(0, start) + text + current.slice(end);
    if (next.length > 128) { setNotice('Up to 128 digits can be entered.'); return; }
    setNotice('');
    update(next, start + text.length);
  }
  function press(key: string) {
    if (submitted || document.hidden) return;
    let start = input.selectionStart ?? current.length;
    const end = input.selectionEnd ?? start;
    if (/^\d$/.test(key)) replace(key);
    else if (key === 'Clear') update('', 0);
    else if (key === 'Backspace' || key === 'Delete') {
      let next = current;
      if (start !== end) next = current.slice(0, start) + current.slice(end);
      else if (key === 'Backspace' && start > 0) { next = current.slice(0, start - 1) + current.slice(start); start--; }
      else if (key === 'Delete') next = current.slice(0, start) + current.slice(start + 1);
      update(next, start);
    } else if (key === 'Enter' && /^\d+$/.test(current)) { submitted = true; props.onSubmit(current); }
  }
  onSettled(() => { input.focus({ preventScroll: true }); });
  return <div class="ai-number-entry" onKeyDown={event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    if (event.target instanceof HTMLButtonElement && ['Enter', ' '].includes(event.key)) {
      event.stopPropagation(); if (event.repeat) event.preventDefault(); return;
    }
    if (/^\d$/.test(event.key) || ['Backspace', 'Delete', 'Enter'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      if (!event.repeat || ['Backspace', 'Delete'].includes(event.key)) press(event.key);
    }
  }}>
    <input ref={input} class="ai-number-input" aria-label="Remembered number" aria-describedby="ai-number-count" type="text" inputmode="none" readonly autocomplete="off" spellcheck={false} placeholder="Enter number" value={value()} onPaste={event => {
      event.preventDefault(); if (submitted) return;
      const text = event.clipboardData?.getData('text').replace(/\s/g, '') ?? '';
      if (/^\d+$/.test(text)) replace(text); else setNotice('Paste digits only.');
    }}/>
    <div id="ai-number-count" class="ai-number-count">{value().length} / {props.length} digits{value().length > props.length ? ` · ${value().length - props.length} extra` : value().length < props.length ? ` · ${props.length - value().length} to go` : ''}</div>
    <div class="ai-number-keypad" role="group" aria-label="Number keypad"><For each={[...'123456789', 'Clear', '0', 'Backspace']}>{key =>
      <Button class="ai-number-key" aria-label={key === 'Backspace' ? 'Erase selection or previous digit' : key === 'Clear' ? 'Clear answer' : `Digit ${key}`} onPointerDown={event => { if (event.button === 0) { event.preventDefault(); press(key); } }} onClick={event => { if (event.detail === 0) press(key); }}><Show when={key === 'Backspace'} fallback={key}><Delete size={22}/></Show></Button>
    }</For></div>
    <Button class="ai-primary ai-number-submit" disabled={!value()} onClick={() => press('Enter')}>Check answer <CornerDownLeft size={20}/></Button>
    <span class="ai-sr-only" role="status">{notice()}</span>
  </div>;
}

function NumberComparison(props: { answer: string; entered: string }) {
  return <dl class="ai-number-comparison" aria-label="Answer comparison"><For each={['Number', 'Your answer']}>{(label, row) =>
    <div><dt>{label}</dt><dd aria-label={row() === 0 ? props.answer : props.entered || 'No answer'}><For each={compareDigits(props.answer, props.entered)}>{pair => <span class={row() === 0 ? '' : `ai-digit-${pair.kind}`} aria-hidden="true">{row() === 0 ? pair.expected : pair.actual || '·'}</span>}</For></dd></div>
  }</For></dl>;
}

function NumberGame(props: GameProps) {
  const [phase, setPhase] = createSignal<'ready' | 'reveal' | 'recall' | 'correct' | 'result'>('ready');
  const [round, setRound] = createSignal({ length: 1, answer: '' });
  const [entered, setEntered] = createSignal('');
  const [remaining, setRemaining] = createSignal(0);
  const canContinue = useResultGate(() => phase() === 'correct');
  const [result, setResult] = createSignal<GameResult | null>(null);
  const timers = useTimers();
  let stage = 'ready', digits = 1, answer = '';
  function start(length = 1) {
    timers.clear(); stage = 'reveal'; digits = length; answer = makeNumber(length);
    const duration = numberRevealTime(length), began = performance.now();
    setRound({ length, answer }); setEntered(''); setResult(null); setRemaining(duration); setPhase('reveal');
    timers.every(() => setRemaining(Math.max(0, duration - (performance.now() - began))), 50);
    timers.after(() => { timers.clear(); stage = 'recall'; setPhase('recall'); }, duration);
  }
  function submit(value: string) {
    if (stage !== 'recall') return;
    setEntered(value);
    const correct = value === answer;
    if (correct && digits < 128) {
      stage = 'correct'; setPhase('correct');
    } else {
      stage = 'result'; setPhase('result');
      const next: GameResult = { value: digits, scope: 'number-v2-hb', unit: 'digits', details: { rulesVersion: 2, expected: answer, entered: value } };
      setResult(next); props.onFinish(next);
    }
  }
  onHidden(() => { if (stage === 'reveal' || stage === 'recall') { timers.clear(); stage = 'ready'; setPhase('ready'); } });
  return <div class="ai-words ai-number-game">
    <Stats items={phase() === 'ready' ? [{ label: 'Digits', value: 1 }] : [{ label: 'Digits', value: round().length }, ...(phase() === 'reveal' ? [{ label: 'Time', value: `${(remaining() / 1000).toFixed(1)}s` }] : [])]}/>
    <div class="ai-word-status" role="status">{phase() === 'reveal' ? 'Memorise' : phase() === 'recall' ? 'Recall the number' : phase() === 'correct' ? 'Correct' : phase() === 'result' ? entered() === round().answer ? 'All 128 digits recalled' : 'Number missed' : ''}</div>
    <div class="ai-word-arena ai-number-arena">
      <Show when={phase() === 'ready'}><div class="ai-word-preview" aria-hidden="true">529</div><Ready onStart={() => start()}/></Show>
      <Show when={phase() === 'reveal'}><div class="ai-number-track"><span style={{ transform: `scaleX(${remaining() / numberRevealTime(round().length)})` }}/></div><div class="ai-number-stimulus">{round().answer}</div></Show>
      <Show when={phase() === 'recall'}><NumberEntry length={round().length} onSubmit={submit}/></Show>
      <Show when={phase() === 'correct' || phase() === 'result'}><NumberComparison answer={round().answer} entered={entered()}/></Show>
      <Show when={phase() === 'correct'}><Button class="ai-primary" disabled={!canContinue()} onClick={() => { if (stage === 'correct' && canContinue()) start(digits + 1); }} onKeyDown={event => { if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault(); }}>Next round · {round().length + 1} digits</Button></Show>
      <Show when={result()}>{value => <Result result={value()} onRetry={() => start()}/>}</Show>
    </div>
  </div>;
}

function VerbalGame(props: GameProps) {
  const [phase, setPhase] = createSignal<Phase>('ready');
  const [prompt, setPrompt] = createSignal({ word: '', wasSeen: false });
  const [score, setScore] = createSignal(0), [lives, setLives] = createSignal(3);
  const [status, setStatus] = createSignal('');
  const [result, setResult] = createSignal<GameResult | null>(null);
  let deck = createWordDeck(), current = { word: '', wasSeen: false }, points = 0, hearts = 3, active = false;
  function start() {
    deck = createWordDeck(); points = 0; hearts = 3; active = true;
    current = deck.next(); setPrompt(current); setScore(0); setLives(3); setStatus(''); setResult(null); setPhase('running');
  }
  function answer(seen: boolean) {
    if (!active || document.hidden) return;
    const correct = seen === current.wasSeen;
    if (correct) points++; else hearts--;
    deck.markSeen(current.word); setScore(points); setLives(hearts);
    setStatus(correct ? 'Correct' : `${current.word}: ${current.wasSeen ? 'seen before' : 'new'}.`);
    if (!hearts) {
      active = false; setPhase('result');
      const next: GameResult = { value: points, scope: 'verbal-v4-balanced', unit: 'words', details: { rulesVersion: 4, 'Last word': current.word, 'Correct answer': current.wasSeen ? 'Seen' : 'New' } };
      setResult(next); props.onFinish(next);
    } else { current = deck.next(); setPrompt(current); }
  }
  onHidden(() => { if (active) { active = false; setPhase('ready'); setStatus('Run paused'); } });
  return <div class="ai-words ai-verbal-game">
    <Stats items={[{ label: 'Score', value: score() }, { label: 'Lives', value: lives(), lives: true }]}/>
    <div class="ai-word-status" role="status">{status()}</div>
    <div class="ai-word-arena ai-verbal-arena">
      <Show when={phase() === 'ready'}><div class="ai-word-preview" aria-hidden="true">garden</div><Ready onStart={start}/></Show>
      <Show when={phase() !== 'ready'}><h2 class="ai-verbal-stimulus" aria-live="polite">{prompt().word}</h2><div class="ai-word-choices"><For each={[true, false]}>{seen => <Button disabled={phase() !== 'running'} onClick={() => answer(seen)} onKeyDown={event => { if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault(); }}>{seen ? 'Seen' : 'New'}</Button>}</For></div></Show>
      <Show when={result()}>{value => <Result result={value()} onRetry={start}><p>Correct answer: <strong>{prompt().wasSeen ? 'Seen' : 'New'}</strong></p></Result>}</Show>
    </div>
  </div>;
}

type TypingStats = { elapsed: number; wpm: number; accuracy: number };
function TypingRun(props: { passage: string; active: boolean; onStats: (value: TypingStats) => void; onFinish: (value: GameResult) => void; keyboard: 'hardware' | 'onscreen' }) {
  const [draftText, setDraftText] = createSignal('');
  const [cursor, setCursor] = createSignal(0), [scroll, setScroll] = createSignal(0);
  const timers = useTimers();
  let input!: HTMLTextAreaElement, mirror!: HTMLDivElement;
  let draft = '', typed = '', composing = false, disposed = false, finished = false, pending: PendingTypingEdit | null = null, lastValue = '', started: number | null = null;
  const edits = [{ text: '', start: 0, end: 0 }];
  let editIndex = 0;
  const acceptsInput = () => !disposed && !finished && props.active && !document.hidden;
  function stats(at = performance.now()) {
    const elapsed = started === null ? 0 : at - started;
    const metrics = typingMetrics(props.passage, typed, elapsed);
    props.onStats({ elapsed, wpm: metrics.wpm, accuracy: metrics.accuracy });
    return { elapsed, ...metrics };
  }
  function clampSelection() {
    if (composing) return;
    const start = Math.min(input.selectionStart, draft.length), end = Math.min(input.selectionEnd, draft.length);
    if (start !== input.selectionStart || end !== input.selectionEnd) input.setSelectionRange(start, end, input.selectionDirection);
  }
  function syncText() {
    const start = Math.min(input.selectionStart, draft.length), end = Math.min(input.selectionEnd, draft.length), direction = input.selectionDirection;
    const value = draft + props.passage.slice(draft.length);
    if (input.value !== value) input.value = value;
    input.setSelectionRange(start, end, direction); lastValue = value;
    setDraftText(draft); setCursor(start);
  }
  function reveal() {
    setCursor(input.selectionStart);
    // Layout reads happen after the Solid text update has settled.
    timers.after(() => {
      if (disposed) return;
      const char = mirror.children[input.selectionStart];
      if (char instanceof HTMLElement) {
        const top = char.offsetTop, bottom = top + char.offsetHeight;
        if (top < input.scrollTop) input.scrollTop = top;
        else if (bottom > input.scrollTop + input.clientHeight) input.scrollTop = bottom - input.clientHeight;
      }
      setScroll(input.scrollTop);
    }, 0);
  }
  function complete(at: number) {
    if (!acceptsInput() || started === null || typed !== props.passage) return;
    const { elapsed, correct, accuracy, wpm } = stats(at);
    if (elapsed <= 0) return;
    finished = true; timers.clear();
    props.onFinish({ value: wpm, scope: `typing-v4-${props.keyboard}-passage`, unit: 'WPM', details: {
      keyboardType: props.keyboard, rulesVersion: 4, format: 'complete-passage', Accuracy: `${accuracy}%`, Correct: `${correct} chars`, Typed: `${typed.length} chars`, Time: `${(elapsed / 1000).toFixed(1)}s`,
    } });
  }
  function commit() {
    typed = draft; syncText();
    if (edits[editIndex].text !== typed) {
      edits.splice(editIndex + 1); edits.push({ text: typed, start: input.selectionStart, end: input.selectionEnd });
      if (edits.length > 1000) edits.shift(); editIndex = edits.length - 1;
    }
  }
  function undo(forward: boolean) {
    if (!acceptsInput()) return;
    editIndex = Math.max(0, Math.min(edits.length - 1, editIndex + (forward ? 1 : -1)));
    const edit = edits[editIndex]; typed = draft = edit.text; syncText();
    input.setSelectionRange(edit.start, edit.end); reveal(); stats(); complete(performance.now());
  }
  function selection() {
    if (document.activeElement === input && acceptsInput()) { clampSelection(); reveal(); }
  }
  onSettled(() => {
    syncText(); stats(); input.setSelectionRange(0, 0);
    if (!document.hidden) input.focus({ preventScroll: true });
    document.addEventListener('selectionchange', selection);
  });
  onCleanup(() => { disposed = true; pending = null; composing = false; document.removeEventListener('selectionchange', selection); });
  return <><div class={['ai-typing-surface', { 'is-complete': !props.active }]}>
    <div ref={mirror} class="ai-typing-passage" aria-hidden="true" style={{ transform: `translateY(${-scroll()}px)` }}><For each={Array.from(props.passage)}>{(char, index) => <span class={{ 'is-correct': index() < draftText().length && draftText()[index()] === char, 'is-error': index() < draftText().length && draftText()[index()] !== char, 'is-current': props.active && index() === cursor() }}>{draftText()[index()] ?? char}</span>}</For></div>
    <textarea ref={input} class="ai-typing-input" disabled={!props.active} aria-label="Complete the passage correctly. Elapsed time starts with your first character." aria-describedby="ai-typing-reference" spellcheck={false} autocomplete="off" autocorrect="off" autocapitalize="off"
      onBeforeInput={event => {
        if (!acceptsInput()) { event.preventDefault(); return; }
        if (['insertFromPaste', 'insertFromDrop'].includes(event.inputType)) { event.preventDefault(); return; }
        if (['historyUndo', 'historyRedo'].includes(event.inputType)) { event.preventDefault(); if (!composing) undo(event.inputType === 'historyRedo'); return; }
        clampSelection();
        if (!composing && event.inputType.startsWith('insert') && draft.length >= props.passage.length && input.selectionStart === input.selectionEnd) { event.preventDefault(); return; }
        if (!composing && /^delete.*Forward$/.test(event.inputType) && input.selectionStart === draft.length && input.selectionEnd === draft.length) { event.preventDefault(); return; }
        pending = { text: draft, value: input.value, start: input.selectionStart };
      }}
      onPaste={event => event.preventDefault()} onDrop={event => event.preventDefault()}
      onKeyDown={event => { if (acceptsInput() && (event.ctrlKey || event.metaKey) && !event.altKey && !composing && ['z', 'y'].includes(event.key.toLowerCase())) { event.preventDefault(); undo(event.shiftKey || event.key.toLowerCase() === 'y'); } }}
      onInput={event => {
        if (!acceptsInput()) return;
        const at = performance.now();
        if (pending) draft = applyTypingEdit(pending, input.value, input.selectionStart);
        else if (input.value !== lastValue) {
          const suffix = lastValue.slice(draft.length);
          draft = suffix && input.value.endsWith(suffix) ? input.value.slice(0, input.value.length - suffix.length) : input.value;
        }
        pending = null; draft = draft.slice(0, props.passage.length); lastValue = input.value;
        if (started === null && draft.length) {
          started = at; timers.every(() => { if (acceptsInput()) stats(); else timers.clear(); }, 100);
        }
        if (!composing && !event.isComposing) commit(); else setDraftText(draft);
        reveal(); stats(at); if (!composing && !event.isComposing) complete(at);
      }}
      onCompositionStart={() => { if (acceptsInput()) { clampSelection(); composing = true; } }}
      onCompositionEnd={() => { if (acceptsInput()) { composing = false; const at = performance.now(); commit(); reveal(); stats(at); complete(at); } }}
      onScroll={() => setScroll(input.scrollTop)} onSelect={selection}
    />
  </div><p id="ai-typing-reference" class="ai-sr-only">{props.passage}</p></>;
}

function TypingGame(props: GameProps) {
  const [keyboard, setKeyboard] = createSignal<'hardware' | 'onscreen'>('hardware');
  const [phase, setPhase] = createSignal<Phase>('ready');
  const [run, setRun] = createSignal<{ passage: string; keyboard: 'hardware' | 'onscreen' } | null>(null);
  const [metrics, setMetrics] = createSignal<TypingStats>({ elapsed: 0, wpm: 0, accuracy: 100 });
  const [result, setResult] = createSignal<GameResult | null>(null);
  const timers = useTimers();
  function selectKeyboard(kind: 'hardware' | 'onscreen') {
    if (keyboard() === kind) return;
    timers.clear(); setKeyboard(kind); setRun(null); setResult(null); setMetrics({ elapsed: 0, wpm: 0, accuracy: 100 }); setPhase('ready');
    props.onScopeChange?.(`typing-v4-${kind}-passage`);
  }
  function start() {
    const next = { passage: typingPassages[Math.floor(Math.random() * typingPassages.length)], keyboard: keyboard() };
    props.onScopeChange?.(`typing-v4-${next.keyboard}-passage`);
    setResult(null); setRun(null); setMetrics({ elapsed: 0, wpm: 0, accuracy: 100 }); setPhase('running');
    // A fresh component gives each run an independent edit history and clock.
    timers.after(() => setRun(next), 0);
  }
  function finish(value: GameResult) { setPhase('result'); setResult(value); props.onFinish(value); }
  onHidden(() => { if (phase() === 'running') { timers.clear(); setRun(null); setPhase('ready'); } });
  return <div class="ai-words ai-typing-game">
    <div class="ai-typing-keyboards" role="radiogroup" aria-label="Typing keyboard"><For each={['hardware', 'onscreen'] as const}>{kind => <Button role="radio" aria-checked={keyboard() === kind ? 'true' : 'false'} tabindex={keyboard() === kind ? 0 : -1} onClick={() => selectKeyboard(kind)} onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 'hardware' : event.key === 'End' ? 'onscreen' : kind === 'hardware' ? 'onscreen' : 'hardware';
      selectKeyboard(next);
      const target = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[next === 'hardware' ? 0 : 1];
      target?.focus({ preventScroll: true });
    }}>{kind === 'hardware' ? 'Hardware keyboard' : 'On-screen keyboard'}</Button>}</For></div>
    <Stats items={[{ label: 'Time', value: `${(metrics().elapsed / 1000).toFixed(1)}s` }, { label: 'WPM', value: metrics().wpm }, { label: 'Accuracy', value: `${metrics().accuracy}%` }]}/>
    <div class="ai-word-status" role="status">{phase() === 'running' && metrics().elapsed === 0 ? 'Type to begin' : phase() === 'result' ? 'Passage complete' : ''}</div>
    <div class="ai-word-arena ai-typing-arena">
      <Show when={phase() === 'ready'}><div class="ai-word-preview ai-typing-preview" aria-hidden="true">{typingPassages[0]}</div><Ready onStart={start}/></Show>
      <Show when={run()} keyed>{value => <TypingRun passage={value.passage} keyboard={value.keyboard} active={phase() === 'running'} onStats={setMetrics} onFinish={finish}/>}</Show>
      <Show when={result()}>{value => <Result result={value()} onRetry={start}/>}</Show>
    </div>
  </div>;
}

export function WordsGame(props: GameProps) {
  return <Show when={props.id === 'number'} fallback={<Show when={props.id === 'verbal'} fallback={<TypingGame {...props}/>}><VerbalGame {...props}/></Show>}><NumberGame {...props}/></Show>;
}
