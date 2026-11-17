import { For, Show, createSignal, onCleanup, onSettled, untrack } from 'solid-js';
import { Ready, Stats, inputKind, useGameContextMenu, useGamePress, useTimers } from './common.tsx';
import { GameRules } from './GameRules.tsx';
import { BoardResult } from './BoardResult.tsx';
import { TRACKING_STEP, TRACKING_WORLD, createTrackingBalls, initialTrackingScore, pickTrackingBall, stepTrackingBalls, trackingFrameDelta, trackingRules } from './tracking-model.ts';
import type { TrackingBall } from './tracking-model.ts';
import type { GameProps, GameResult, InputKind } from './types.ts';
import './tracking.css';

type Phase = 'intro' | 'mark' | 'conceal' | 'move' | 'recall' | 'review' | 'result' | 'interrupted';

export function TrackingGame(props: GameProps) {
  const hard = untrack(() => props.id === 'tracking-hard');
  const scope = hard ? 'tracking-hard-v1' : 'tracking-v1';
  const timers = useTimers(), presses = useGamePress();
  let phase: Phase = 'intro', score = initialTrackingScore(), rules = trackingRules(0, hard);
  let balls = createTrackingBalls(rules, 719), result: GameResult | undefined;
  let message = '';
  let frame = 0, disposed = false, elapsed = 0, accumulator = 0;
  let previousTime: number | null = null;
  let input: InputKind | undefined, wrong = -1, held = false, redFlash = false, redRevealed = false;
  let visible = true;
  let board!: HTMLDivElement;
  const elements = new Map<number, HTMLButtonElement>();
  const [cursor, setCursor] = createSignal(0);
  const snapshot = () => ({ phase, score: { ...score, selected: [...score.selected] }, rules, balls: balls.map(ball => ({ ...ball })), message, result, wrong, redFlash, redRevealed });
  const [view, setView] = createSignal(snapshot());
  const publish = () => setView(snapshot());
  const active = () => !['intro', 'result', 'interrupted'].includes(phase);
  useGameContextMenu(() => board, active);
  const focusBall = (id: number) => { setCursor(id); elements.get(id)?.focus({ preventScroll: true }); };
  const stop = () => { timers.clear(); cancelAnimationFrame(frame); frame = 0; held = false; };
  function paint() {
    for (const ball of balls) {
      const element = elements.get(ball.id);
      if (element) { element.style.left = `${ball.x / TRACKING_WORLD * 100}%`; element.style.top = `${ball.y / TRACKING_WORLD * 100}%`; }
    }
  }
  function interrupt() {
    if (!active() || disposed) return;
    stop(); phase = 'interrupted';
    message = 'Run interrupted. Restart with fresh balls. This run was not scored.';
    props.onActivityChange?.(false); publish();
  }
  function tick(now: number) {
    frame = 0;
    if (disposed || phase !== 'move') return;
    if (document.hidden || !visible) { interrupt(); return; }
    const delta = trackingFrameDelta(previousTime, now);
    previousTime = now;
    if (delta === null) { interrupt(); return; }
    accumulator += delta;
    while (accumulator >= TRACKING_STEP && elapsed < rules.duration) {
      stepTrackingBalls(balls); accumulator -= TRACKING_STEP; elapsed += TRACKING_STEP;
    }
    paint();
    const flashing = hard && elapsed >= 1.5 && elapsed < 2.3;
    if (flashing !== redFlash) {
      redFlash = flashing;
      if (flashing) { redRevealed = true; message = 'Red means leave it. One target is now forbidden.'; }
      else message = `Keep following the ${rules.targets - 1} remaining targets.`;
      publish();
    }
    if (elapsed >= rules.duration) {
      phase = 'recall'; message = `Select the ${rules.targets - Number(hard)} remaining ${hard ? 'safe targets' : 'lit balls'}. Any order.`; publish();
      // Focus enters only after movement ends, so a focus ring cannot identify a moving ball.
      timers.after(() => { if (phase === 'recall') focusBall(0); }, 0);
    } else frame = requestAnimationFrame(tick);
  }
  function round() {
    stop(); rules = trackingRules(score.completed, hard);
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    balls = createTrackingBalls(rules, seed); score = { ...score, selected: [] }; wrong = -1;
    redFlash = redRevealed = false;
    if (document.activeElement instanceof HTMLElement && board.contains(document.activeElement)) document.activeElement.blur();
    phase = 'mark'; message = hard ? `Remember ${rules.targets} lit balls. If one flashes red while moving, leave it.` : `Remember these ${rules.targets} lit balls.`;
    publish();
    timers.after(() => {
      if (phase !== 'mark') return;
      phase = 'conceal'; message = 'Keep your eyes on the targets.'; publish();
      timers.after(() => {
        if (phase !== 'conceal') return;
        phase = 'move'; elapsed = accumulator = 0; previousTime = null;
        message = 'Follow the balls. Wait for them to stop.'; publish(); frame = requestAnimationFrame(tick);
      }, 350);
    }, 2000);
  }
  function start() {
    if (document.hidden || !visible) return;
    score = initialTrackingScore(); input = undefined; result = undefined;
    props.onScopeChange?.(scope); props.onActivityChange?.(true); round();
  }
  function finish() {
    stop(); phase = 'result';
    result = { value: score.completed, scope, unit: 'rounds', details: { rounds: score.completed,
      accuracy: score.picks ? Math.round(score.correct / score.picks * 100) : 0,
      correct: score.correct, picks: score.picks, inputKind: input ?? 'mouse', rulesVersion: 1 } };
    message = hard ? 'Dashed rings mark missed targets. X marks your wrong pick and red flashes.' : 'Dashed rings mark missed targets. X marks your wrong pick.';
    publish(); props.onActivityChange?.(false); props.onFinish(result);
  }
  function pick(id: number, event: Event) {
    if (phase !== 'recall' || disposed || document.hidden) return;
    const next = pickTrackingBall(score, balls, id);
    if (next.outcome === 'ignored') return;
    input ??= inputKind(event); score = next.score;
    if (next.outcome === 'correct') { message = `${score.selected.length} of ${rules.targets - Number(hard)} targets found.`; publish(); return; }
    phase = 'review';
    if (next.outcome === 'complete') {
      round();
    } else {
      wrong = id;
      message = balls[id].red ? 'That ball flashed red. One life lost. Dashed rings show the targets.' : 'That ball was not lit. One life lost. Dashed rings show the targets.';
      publish();
      if (next.outcome === 'finished') finish(); else timers.after(round, 1800);
    }
  }
  function face(ball: TrackingBall) {
    const state = view(), reveal = state.phase === 'review' || state.phase === 'result';
    if (state.wrong === ball.id) return 'wrong';
    if (state.score.selected.includes(ball.id)) return 'correct';
    if ((state.redFlash || reveal) && ball.red) return 'red';
    if (reveal && ball.target) return 'missed';
    if ((state.phase === 'mark' || state.phase === 'intro') && ball.target) return 'lit';
    return 'plain';
  }
  function label(ball: TrackingBall) {
    const state = face(ball);
    return `Ball ${ball.id + 1}${state === 'plain' ? '' : state === 'lit' ? ', target' : state === 'red' ? ', red decoy, avoid' : state === 'wrong' ? ', incorrect pick' : state === 'missed' ? ', missed target' : ', selected target'}`;
  }
  function keydown(event: KeyboardEvent, id: number) {
    if (phase !== 'recall' || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const current = balls[id], direction = event.key;
      const ordered = [...balls].sort((a, b) => a.y - b.y || a.x - b.x);
      if (direction === 'Home' || direction === 'End') { focusBall(ordered[direction === 'Home' ? 0 : ordered.length - 1].id); return; }
      const dx = direction === 'ArrowLeft' ? -1 : direction === 'ArrowRight' ? 1 : 0;
      const dy = direction === 'ArrowUp' ? -1 : direction === 'ArrowDown' ? 1 : 0;
      const candidates = balls.filter(ball => (ball.x - current.x) * dx + (ball.y - current.y) * dy > 1);
      candidates.sort((a, b) => {
        const cost = (ball: TrackingBall) => Math.hypot(ball.x - current.x, ball.y - current.y) + Math.abs((ball.x - current.x) * dy - (ball.y - current.y) * dx);
        return cost(a) - cost(b);
      });
      if (candidates[0]) focusBall(candidates[0].id);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); if (event.repeat || held) return; held = true; pick(id, event);
    }
  }
  onSettled(() => {
    const visibility = () => { if (document.hidden) interrupt(); };
    const release = (event: KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') held = false; };
    const observer = new IntersectionObserver(entries => { visible = entries.every(entry => entry.isIntersecting); if (!visible) interrupt(); });
    observer.observe(board);
    document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', interrupt);
    window.addEventListener('pagehide', interrupt); window.addEventListener('keyup', release);
    return () => {
      observer.disconnect(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', interrupt);
      window.removeEventListener('pagehide', interrupt); window.removeEventListener('keyup', release);
    };
  });
  onCleanup(() => { disposed = true; stop(); props.onActivityChange?.(false); });
  return <section class="ai-tracking-game" data-phase={view().phase} aria-label={hard ? 'Object tracking, hard' : 'Object tracking'}>
    <Stats items={[{ label: 'Rounds', value: view().score.completed }, { label: 'Targets', value: `${view().rules.targets - Number(view().redRevealed)} / ${view().rules.total}` }, { label: 'Lives', value: view().score.lives, lives: true }]}/>
    <p class="ai-tracking-status" role="status">{view().message}</p>
    <div class="ai-tracking-stage">
      <div class="ai-tracking-board" ref={board} role="group" aria-label="Tracking field. After movement stops, use arrow keys to navigate and Enter or Space to select."
        data-game-input={!['intro', 'result', 'interrupted'].includes(view().phase) ? '' : undefined}>
        <For each={view().balls} keyed={ball => ball.id}>{ball => <button type="button" ref={element => { elements.set(ball().id, element); }}
          class={['ai-tracking-ball', `is-${face(ball())}`]} aria-label={label(ball())}
          disabled={view().phase !== 'recall'}
          aria-disabled={view().phase !== 'recall' || view().score.selected.includes(ball().id) ? 'true' : 'false'}
          aria-hidden={['intro', 'interrupted', 'conceal', 'move'].includes(view().phase) ? 'true' : undefined}
          tabindex={view().phase === 'recall' && cursor() === ball().id ? 0 : -1}
          style={{ left: `${ball().x / TRACKING_WORLD * 100}%`, top: `${ball().y / TRACKING_WORLD * 100}%` }}
          onFocus={() => setCursor(ball().id)} onKeyDown={event => keydown(event, ball().id)}
          onPointerDown={event => { if (phase === 'recall' && presses.down(event)) { focusBall(ball().id); pick(ball().id, event); } }}
          onClick={event => { if (presses.click(event) && !held) pick(ball().id, event); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <Show when={face(ball()) === 'red' || face(ball()) === 'wrong'}><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></Show>
            <Show when={face(ball()) === 'correct'}><path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></Show>
            <Show when={face(ball()) === 'lit' || face(ball()) === 'missed'}><circle cx="12" cy="12" r="3.5" fill="currentColor"/></Show>
          </svg>
        </button>}</For>
        <Show when={view().phase === 'intro'}><Ready overlay onStart={start}/></Show>
      </div>
      <Show when={view().result}>{finished => <BoardResult result={finished()} onRetry={start}/>}</Show>
      <Show when={view().phase === 'interrupted'}><BoardResult result={{ value: 0, scope, unit: 'rounds' }} onRetry={start} announceResult={false}/></Show>
    </div>
    <Show when={view().phase === 'intro'}><GameRules detail={hard ? 'During motion, one target and one distractor flash red with an X. Leave both. Select the remaining targets after movement stops. Three lives; any wrong pick costs one.' : 'Select every remembered target to advance. Picking an unlit ball costs a life. Three lives per run. Motion is essential to this game.'}>
      {hard ? 'Remember the lit balls. If one flashes red, leave it. Motion is essential to this game.' : 'Remember the lit balls, follow them as they move, then select them after they stop.'}
    </GameRules></Show>
  </section>;
}
