import { createSignal, For, onCleanup, onSettled, Show } from 'solid-js';
import { Button } from '../../shared/components/Button.tsx';
import { CornerDownLeft, Delete } from '../../shared/components/Icons.tsx';
import { Ready, Result, Stats, useGamePress, useResultGate, useTimers } from './common.tsx';
import type { GameProps, GameResult } from './types.ts';
import { compareDigits, createWordDeck, makeNumber, numberRevealTime } from './words-logic.ts';
import './words.css';

type Phase = 'ready' | 'running' | 'result';

function onHidden(cancel: () => void) {
  const visibility = () => { if (document.hidden) cancel(); };
  onSettled(() => { document.addEventListener('visibilitychange', visibility); });
  onCleanup(() => document.removeEventListener('visibilitychange', visibility));
}

function NumberEntry(props: { length: number; onSubmit: (value: string) => void; onActivity: () => void }) {
  const presses = useGamePress();
  const [value, setValue] = createSignal('');
  const [notice, setNotice] = createSignal('');
  let input!: HTMLInputElement, current = '', submitted = false;
  function update(next: string, caret: number) {
    if (next !== current) props.onActivity();
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
      <Button class="ai-number-key" aria-label={key === 'Backspace' ? 'Erase selection or previous digit' : key === 'Clear' ? 'Clear answer' : `Digit ${key}`} onPointerDown={event => { if (presses.down(event)) press(key); }} onClick={event => { if (presses.click(event)) press(key); }}><Show when={key === 'Backspace'} fallback={key}><Delete size={22}/></Show></Button>
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
  props.onActivityChange?.(false);
  const [phase, setPhase] = createSignal<'ready' | 'reveal' | 'recall' | 'correct' | 'result'>('ready');
  const [round, setRound] = createSignal({ length: 1, answer: '' });
  const [entered, setEntered] = createSignal('');
  const [remaining, setRemaining] = createSignal(0);
  const canContinue = useResultGate(() => phase() === 'correct');
  const [result, setResult] = createSignal<GameResult | null>(null);
  const timers = useTimers();
  let stage = 'ready', digits = 1, answer = '';
  function start(length = 1) {
    if (length === 1) props.onActivityChange?.(false);
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
  onHidden(() => { if (stage === 'reveal' || stage === 'recall') { timers.clear(); stage = 'ready'; setPhase('ready'); props.onActivityChange?.(false); } });
  return <div class="ai-words ai-number-game">
    <Stats items={[{ label: 'Digits', value: phase() === 'ready' ? 1 : round().length }, { label: 'Time', value: phase() === 'reveal' ? `${(remaining() / 1000).toFixed(1)}s` : '—' }]}/>
    <div class="ai-word-status" role="status">{phase() === 'reveal' ? 'Memorise' : phase() === 'recall' ? 'Recall the number' : phase() === 'correct' ? 'Correct' : phase() === 'result' ? entered() === round().answer ? 'All 128 digits recalled' : 'Number missed' : ''}</div>
    <div class="ai-word-arena ai-number-arena" data-complete={phase() === 'result'}>
      <Show when={phase() === 'ready'}><div class="ai-word-preview" aria-hidden="true">529</div><Ready onStart={() => start()}/></Show>
      <Show when={phase() === 'reveal'}><div class="ai-number-track"><span style={{ transform: `scaleX(${remaining() / numberRevealTime(round().length)})` }}/></div><div class="ai-number-stimulus">{round().answer}</div></Show>
      <Show when={phase() === 'recall'}><NumberEntry length={round().length} onSubmit={submit} onActivity={() => props.onActivityChange?.(true)}/></Show>
      <Show when={phase() === 'correct'}><NumberComparison answer={round().answer} entered={entered()}/></Show>
      <Show when={phase() === 'correct'}><Button class="ai-primary" disabled={!canContinue()} onClick={event => { if (stage === 'correct' && canContinue.accept(event)) start(digits + 1); }} onKeyDown={event => { if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault(); }}>Next round · {round().length + 1} digits</Button></Show>
      <Show when={result()}>{value => <Result result={value()} onRetry={() => start()}><NumberComparison answer={round().answer} entered={entered()}/></Result>}</Show>
    </div>
  </div>;
}

function VerbalGame(props: GameProps) {
  props.onActivityChange?.(false);
  const presses = useGamePress();
  const [phase, setPhase] = createSignal<Phase>('ready');
  const [prompt, setPrompt] = createSignal({ word: '', wasSeen: false });
  const [score, setScore] = createSignal(0), [lives, setLives] = createSignal(3);
  const [status, setStatus] = createSignal('');
  const [result, setResult] = createSignal<GameResult | null>(null);
  let deck = createWordDeck(), current = { word: '', wasSeen: false }, points = 0, hearts = 3, active = false;
  function start() {
    props.onActivityChange?.(false);
    deck = createWordDeck(); points = 0; hearts = 3; active = true;
    current = deck.next(); setPrompt(current); setScore(0); setLives(3); setStatus(''); setResult(null); setPhase('running');
  }
  function answer(seen: boolean) {
    // A second press before the next word renders still belongs to the old word.
    if (!active || document.hidden || current !== prompt()) return;
    props.onActivityChange?.(true);
    const correct = seen === current.wasSeen;
    if (correct) points++; else hearts--;
    deck.markSeen(current.word); setScore(points); setLives(hearts);
    setStatus(correct ? 'Correct' : `${current.word}: ${current.wasSeen ? 'seen before' : 'new'}.`);
    if (!hearts) {
      active = false; setPhase('result');
      const next: GameResult = { value: points, scope: 'verbal-v5-progressive', unit: 'words', details: { rulesVersion: 5, 'Last word': current.word, 'Correct answer': current.wasSeen ? 'Seen' : 'New' } };
      setResult(next); props.onFinish(next);
    } else { current = deck.next(); setPrompt(current); }
  }
  onHidden(() => { if (active) { active = false; setPhase('ready'); setStatus('Run paused'); props.onActivityChange?.(false); } });
  return <div class="ai-words ai-verbal-game">
    <Stats items={[{ label: 'Score', value: score() }, { label: 'Lives', value: lives(), lives: true }]}/>
    <div class="ai-word-status" role="status">{status()}</div>
    <div class="ai-word-arena ai-verbal-arena" data-complete={phase() === 'result'}>
      <Show when={phase() === 'ready'}><div class="ai-word-preview" aria-hidden="true">garden</div><Ready onStart={start}/></Show>
      <Show when={phase() === 'running'}><h2 class="ai-verbal-stimulus" aria-live="polite">{prompt().word}</h2></Show>
      <Show when={phase() === 'running'}><div class="ai-word-choices"><For each={[true, false]}>{seen => <Button onPointerDown={event => { if (presses.down(event)) { event.currentTarget.focus({ preventScroll: true }); answer(seen); } }} onClick={event => { if (presses.click(event)) answer(seen); }} onKeyDown={event => { if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault(); }}>{seen ? 'Seen' : 'New'}</Button>}</For></div></Show>
      <Show when={result()}>{value => <Result result={value()} onRetry={start}><h2 class="ai-verbal-stimulus">{prompt().word}</h2><p>Correct answer: <strong>{prompt().wasSeen ? 'Seen' : 'New'}</strong></p></Result>}</Show>
    </div>
  </div>;
}

export function WordsGame(props: GameProps) {
  return <Show when={props.id === 'number'} fallback={<Show when={props.id === 'verbal'}><VerbalGame {...props}/></Show>}><NumberGame {...props}/></Show>;
}
