import { For, Show, createSignal, onCleanup, onSettled } from 'solid-js';
import { Button } from '../../shared/components/Button.tsx';
import { CirclePlay } from '../../shared/components/Icons.tsx';
import { BoardResult } from './BoardResult.tsx';
import { GameRules } from './GameRules.tsx';
import { Ready, Stats, inputKind, useGameContextMenu, useGamePress, useResultGate, useTimers } from './common.tsx';
import { createRhythmAudio } from './rhythm-audio.ts';
import { composeRhythm, type RhythmComposition } from './rhythm-composition.ts';
import { RHYTHM_FIRST_TAP_MS, judgeRhythm, rhythmResponseDeadline, type RhythmJudgment } from './rhythm-model.ts';
import type { GameProps, GameResult, InputKind } from './types.ts';
import './rhythm.css';

type Phase = 'ready' | 'loading' | 'listen' | 'response' | 'review' | 'finished' | 'cancelled';
type Run = {
  phase: Phase; level: number; lives: number; composition: RhythmComposition; taps: number[];
  judgment: RhythmJudgment | null; input: InputKind | null; message: string; result: GameResult | null;
  attempts: number; matched: number; total: number; errorSum: number; errorCount: number;
};
const makePhrase = (level: number) => composeRhythm({ seed: crypto.getRandomValues(new Uint32Array(1))[0], level });
const initialRun = (): Run => ({ phase: 'ready', level: 1, lives: 3, composition: makePhrase(1), taps: [], judgment: null, input: null, message: '', result: null, attempts: 0, matched: 0, total: 0, errorSum: 0, errorCount: 0 });
const scope = (input: InputKind | null) => `rhythm-v1-${input ?? 'mouse'}`;

export function RhythmGame(props: GameProps) {
  let current = initialRun();
  const [run, setRun] = createSignal(current);
  const [pulse, setPulse] = createSignal(-1);
  const [volume, setVolume] = createSignal(.65);
  const [muted, setMuted] = createSignal(false);
  const [successReady, setSuccessReady] = createSignal(false);
  const audio = createRhythmAudio();
  audio.setVolume(.65);
  const timers = useTimers();
  const presses = useGamePress();
  const reviewReady = useResultGate(() => run().phase === 'review' && !run().judgment?.passed);
  let board!: HTMLDivElement;
  let pad!: HTMLButtonElement;
  let nextButton: HTMLButtonElement | undefined;
  let epoch = 0, frame = 0, pulseUntil = 0, responseDeadline = Infinity;
  let held = false, disposed = false;
  const heldPointers = new Set<number>();
  const active = () => ['loading', 'listen', 'response', 'review'].includes(current.phase);
  const terminal = () => run().phase === 'finished' || run().phase === 'cancelled';
  useGameContextMenu(() => board, active);
  function update(next: Run) { current = next; setRun(next); }
  function stop() { epoch++; timers.clear(); cancelAnimationFrame(frame); audio.stop(); setPulse(-1); }
  function retry() {
    stop(); props.onActivityChange?.(false); props.onScopeChange?.(scope(null));
    update(initialRun()); held = false; heldPointers.clear(); setSuccessReady(false);
  }
  function interrupt() {
    if (!active() || disposed) return;
    stop(); props.onActivityChange?.(false);
    update({ ...current, phase: 'cancelled', message: 'Run interrupted. This unfinished run was not scored.' });
  }
  function flash(index: number) {
    setPulse(index); pulseUntil = performance.now() + 125;
    timers.after(() => { if (current.phase === 'response' && performance.now() >= pulseUntil) setPulse(-1); }, 130);
  }
  function paintListening(startedAt: number, token: number) {
    if (disposed || token !== epoch || current.phase !== 'listen') return;
    const now = performance.now(), elapsed = now - startedAt;
    let index = -1;
    current.composition.targetTimesMs.forEach((time, note) => { if (time <= elapsed) index = note; });
    setPulse(index >= 0 && elapsed - current.composition.targetTimesMs[index] < 140 ? index : -1);
    frame = requestAnimationFrame(() => paintListening(startedAt, token));
  }
  function respond(token: number) {
    if (token !== epoch || current.phase !== 'listen') return;
    cancelAnimationFrame(frame); setPulse(-1);
    responseDeadline = performance.now() + RHYTHM_FIRST_TAP_MS;
    update({ ...current, phase: 'response', message: 'Your turn. Tap the rhythm.' });
    pad.focus({ preventScroll: true });
    timers.after(() => { if (token === epoch && current.phase === 'response' && current.taps.length === 0) resolve(); }, RHYTHM_FIRST_TAP_MS);
  }
  async function start() {
    if (disposed || document.hidden || !['ready', 'review'].includes(current.phase)) return;
    if (current.phase === 'review' && !(current.judgment?.passed ? successReady() : reviewReady())) return;
    stop();
    const token = epoch;
    const composition = current.phase === 'review' ? makePhrase(current.level) : current.composition;
    update({ ...current, phase: 'loading', composition, taps: [], judgment: null, message: 'Preparing the phrase.' });
    props.onActivityChange?.(true);
    let unlocked = false;
    try { unlocked = await audio.unlock(); } catch { unlocked = false; }
    if (disposed || token !== epoch || document.hidden) return;
    if (!unlocked) {
      update({ ...current, phase: 'ready', message: 'Sound could not start. Check audio permissions, then try Start again.' });
      props.onActivityChange?.(false); return;
    }
    let prepared = false;
    try { prepared = await audio.prepare(composition); } catch { prepared = false; }
    if (disposed || token !== epoch || document.hidden) return;
    if (!prepared) {
      audio.stop();
      update({ ...current, phase: 'ready', message: 'The phrase could not load. Try Start again.' });
      props.onActivityChange?.(false); return;
    }
    let playback: { startedAtMs: number; durationMs: number } | null = null;
    try { playback = audio.play(composition); } catch { playback = null; }
    if (!playback) {
      update({ ...current, phase: 'ready', message: 'Sound could not start. Check audio permissions, then try Start again.' });
      props.onActivityChange?.(false); return;
    }
    update({ ...current, phase: 'listen', message: 'Listen and watch the pulses.' });
    pad.focus({ preventScroll: true });
    paintListening(playback.startedAtMs, token);
    timers.after(() => respond(token), Math.max(0, playback.startedAtMs + playback.durationMs + 350 - performance.now()));
  }
  function resolve() {
    if (current.phase !== 'response') return;
    stop();
    const judgment = judgeRhythm(current.composition.targetTimesMs, current.taps, current.composition.beatMs);
    const lives = current.lives - Number(!judgment.passed);
    const level = current.level + Number(judgment.passed);
    const next: Run = { ...current, judgment, lives, level, phase: 'review', attempts: current.attempts + 1,
      matched: current.matched + judgment.matched, total: current.total + judgment.total,
      errorSum: current.errorSum + judgment.errors.reduce((sum, error) => sum + Math.abs(error), 0), errorCount: current.errorCount + judgment.errors.length,
      message: judgment.passed ? 'Rhythm matched. Next phrase ready.' : judgment.missing ? `${judgment.missing} missing ${judgment.missing === 1 ? 'tap' : 'taps'}. Compare the spacing below.` : judgment.extra ? `${judgment.extra} extra ${judgment.extra === 1 ? 'tap' : 'taps'}. Compare the spacing below.` : 'Timing drifted. Compare your spacing below.' };
    if (!lives) {
      const result: GameResult = { value: level - 1, unit: 'levels', scope: scope(next.input), details: {
        levels: level - 1, attempts: next.attempts, accuracy: next.total ? Math.round(next.matched / next.total * 100) : 0,
        meanErrorMs: next.errorCount ? Math.round(next.errorSum / next.errorCount) : 0,
        inputKind: next.input ?? 'mouse', rulesVersion: 1,
      } };
      next.phase = 'finished'; next.result = result; update(next); props.onActivityChange?.(false); props.onFinish(result);
      pad.blur();
    } else {
      update(next);
      if (judgment.passed) {
        const ready = !held && !heldPointers.size;
        setSuccessReady(ready);
        if (ready) timers.after(() => { if (current.phase === 'review') nextButton?.focus({ preventScroll: true }); }, 0);
      }
      else timers.after(() => { if (current.phase === 'review' && !document.hidden) nextButton?.focus({ preventScroll: true }); }, 800);
    }
  }
  function tap(event: Event) {
    if (disposed || document.hidden || current.phase !== 'response') return;
    const now = performance.now();
    if (now >= responseDeadline) { resolve(); return; }
    const input = inputKind(event);
    if (current.input && current.input !== input) { update({ ...current, message: `Use ${current.input} for this run. Restart to switch.` }); return; }
    const taps = [...current.taps, now];
    if (!current.input) props.onScopeChange?.(scope(input));
    update({ ...current, taps, input, message: 'Keep the spacing you heard.' });
    flash(taps.length - 1);
    try { audio.tap(current.composition, taps.length - 1); } catch { /* Visual feedback still preserves the response. */ }
    if (taps.length === 1) {
      responseDeadline = rhythmResponseDeadline(current.composition.targetTimesMs, current.composition.beatMs, now);
      const token = epoch;
      timers.after(() => { if (token === epoch && current.phase === 'response') resolve(); }, responseDeadline - now);
    }
    if (taps.length > current.composition.targetTimesMs.length) resolve();
  }
  function keydown(event: KeyboardEvent) {
    if (event.target !== pad || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.isComposing || ![' ', 'Enter'].includes(event.key) || !active()) return;
    event.preventDefault();
    if (event.repeat || held) return;
    held = true; tap(event);
  }
  onSettled(() => {
    const releaseSuccess = () => {
      if (successReady() || held || heldPointers.size || current.phase !== 'review' || !current.judgment?.passed) return;
      timers.after(() => {
        if (successReady() || held || heldPointers.size || current.phase !== 'review' || !current.judgment?.passed) return;
        setSuccessReady(true); nextButton?.focus({ preventScroll: true });
      }, 0);
    };
    const keyup = (event: KeyboardEvent) => { if ([' ', 'Enter'].includes(event.key)) { held = false; releaseSuccess(); } };
    const pointerup = (event: PointerEvent) => { heldPointers.delete(event.pointerId); releaseSuccess(); };
    const visibility = () => { if (document.hidden) interrupt(); };
    window.addEventListener('keyup', keyup); window.addEventListener('blur', interrupt); window.addEventListener('pagehide', interrupt);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pointerup', pointerup); window.addEventListener('pointercancel', pointerup);
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => !entry.isIntersecting)) interrupt(); });
    observer.observe(board);
    return () => {
      observer.disconnect();
      window.removeEventListener('keyup', keyup); window.removeEventListener('blur', interrupt); window.removeEventListener('pagehide', interrupt);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pointerup', pointerup); window.removeEventListener('pointercancel', pointerup);
    };
  });
  onCleanup(() => { disposed = true; stop(); audio.dispose(); props.onActivityChange?.(false); });
  const failed = () => !!run().judgment && !run().judgment!.passed;
  const reviewSpan = () => Math.max(run().composition.targetTimesMs.at(-1) ?? 1, run().judgment?.offsets.at(-1) ?? 1, 1);
  const x = (time: number) => 30 + time / reviewSpan() * 540;
  function accessibleReview() {
    const judgment = run().judgment;
    if (!judgment || judgment.passed) return '';
    const notes = run().composition.targetTimesMs.map((time, index) => {
      const actual = judgment.offsets[index];
      return `Note ${index + 1}: heard at ${Math.round(time)} milliseconds; ${actual === undefined ? 'missing tap' : `your tap at ${Math.round(actual)} milliseconds`}.`;
    });
    return `${judgment.offsets.length ? 'First tap aligned. ' : ''}${notes.join(' ')}${judgment.extra ? ` ${judgment.extra} extra taps.` : ''}`;
  }
  const cancelledResult: GameResult = { value: 0, unit: 'levels', scope: 'rhythm-v1-mouse' };

  return <section class="rhythm-game" data-phase={run().phase} onKeyDown={keydown} aria-label="Rhythm memory">
    <Stats items={[{ label: 'Level', value: run().level }, { label: 'Notes', value: run().composition.targetTimesMs.length }, { label: 'Lives', value: run().lives, lives: true }]}/>
    <div class="rhythm-toolbar"><span class="rhythm-palette">{run().composition.paletteName}</span><div class="rhythm-audio-controls">
      <Button aria-label={muted() ? 'Unmute rhythm audio' : 'Mute rhythm audio'} aria-pressed={muted() ? 'true' : 'false'} onClick={() => { const next = !muted(); setMuted(next); audio.setVolume(next ? 0 : volume()); }}>{muted() ? 'Sound off' : 'Sound on'}</Button>
      <label class="rhythm-volume"><span class="ai-sr-only">Audio volume</span><input type="range" min="0" max="1" step="0.05" value={volume()} onInput={event => { const next = Number(event.currentTarget.value); setVolume(next); if (!muted()) audio.setVolume(next); }}/></label>
    </div></div>
    <div class="rhythm-status" role="status"><span>{run().message}</span>
      <Show when={failed()}><span class="rhythm-review-detail">{run().judgment!.errors.length ? `${Math.round(run().judgment!.meanErrorMs)} ms average error` : 'No timed response'} · ±{Math.round(run().judgment!.toleranceMs)} ms to pass</span></Show>
    </div>
    <Show when={failed()}><p class="ai-sr-only">{accessibleReview()}</p></Show>
    <div ref={board} class={['rhythm-board', run().phase === 'ready' && 'is-preview', ['loading', 'listen', 'response', 'review'].includes(run().phase) && 'is-active', terminal() && 'is-terminal', failed() && 'is-failed']}>
      <button ref={pad} type="button" class="rhythm-pad" disabled={terminal()} aria-label={run().phase === 'response' ? 'Tap the rhythm. Space, Enter, or press here.' : 'Rhythm pulse surface'} aria-disabled={run().phase !== 'response' ? 'true' : 'false'} tabindex={terminal() || run().phase === 'ready' || run().phase === 'review' ? -1 : 0} data-game-input={['loading', 'listen', 'response', 'review'].includes(run().phase) ? '' : undefined}
        onPointerDown={event => { if (!active() || !presses.down(event)) return; heldPointers.add(event.pointerId); pad.focus({ preventScroll: true }); tap(event); }}
        onClick={event => { if (!active()) return; event.preventDefault(); if (!held && presses.click(event)) tap(event); }}>
        <div class={['rhythm-art', pulse() >= 0 && 'has-pulse']} aria-hidden="true">
          <svg class="rhythm-orbit" viewBox="0 0 240 180"><circle class="rhythm-ring rhythm-ring-outer" cx="120" cy="90" r="74"/><circle class="rhythm-ring" cx="120" cy="90" r="56"/><circle class="rhythm-core" cx="120" cy="90" r="38"/><path class="rhythm-wave" d="M85 90h15l6-16 9 33 10-42 10 38 7-13h13"/></svg>
          <div class="rhythm-note-slots"><For each={run().composition.targetTimesMs}>{(_, index) => <span class={[pulse() === index() && 'is-lit', run().phase === 'response' && index() < run().taps.length && 'is-tapped']}/>}</For></div>
        </div>
        <Show when={failed()}><div class="rhythm-review" aria-hidden="true"><svg viewBox="0 0 600 122" preserveAspectRatio="xMidYMid meet">
          <path class="rhythm-track" d="M30 35H570M30 91H570"/>
          <For each={run().composition.targetTimesMs}>{(time, index) => <g><circle class="rhythm-target" cx={x(time)} cy="35" r="7"/><Show when={index() >= run().taps.length}><path class="rhythm-missing" d={`M${x(time) - 5} 86l10 10m-10 0l10-10`}/></Show></g>}</For>
          <For each={run().judgment?.offsets ?? []}>{(time, index) => <g><Show when={index() < run().composition.targetTimesMs.length}><path class="rhythm-error-line" d={`M${x(run().composition.targetTimesMs[index()])} 43L${x(time)} 83`}/></Show><circle class="rhythm-actual" cx={x(time)} cy="91" r="7"/></g>}</For>
        </svg><div class="rhythm-legend"><span>Heard <i class="rhythm-target-key"/></span><span>You <i class="rhythm-actual-key"/></span><Show when={run().taps.length > 0}><span>First tap aligned</span></Show></div></div></Show>
      </button>
      <Show when={run().phase === 'ready'}><Ready overlay onStart={() => { void start(); }} rules={<GameRules detail="Three lives. Each matched phrase advances a level. Your first tap sets the start; match every gap.">Repeat the notes that light the pad. Tap their spacing with Space, Enter, or the pad.</GameRules>}/></Show>
      <Show when={run().phase === 'review'}><div class="rhythm-next"><Button ref={nextButton} class="ai-primary" disabled={run().judgment?.passed ? !successReady() : !reviewReady()} onClick={event => { if (current.judgment?.passed ? successReady() : reviewReady.accept(event)) void start(); }} onKeyDown={event => { if (event.repeat && [' ', 'Enter'].includes(event.key)) event.preventDefault(); }}><CirclePlay size={18}/>{run().judgment?.passed ? 'Next phrase' : 'Try another phrase'}</Button></div></Show>
      <Show when={run().result}>{result => <BoardResult result={result()} onRetry={retry}/>}</Show>
      <Show when={run().phase === 'cancelled'}><BoardResult result={cancelledResult} onRetry={retry} announceResult={false}/></Show>
    </div>
  </section>;
}

export default RhythmGame;
