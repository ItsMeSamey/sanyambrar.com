import { For, Show, createSignal, onCleanup, onSettled } from 'solid-js';
import { Button } from '../../shared/components/Button.tsx';
import { Stats, setRestartBlocked, useTimers } from './common.tsx';
import { AimEngine, ReactionEngine, TapEngine, aimScope, reactionScope } from './speed-engine.ts';
import type { AimView, Press, ReactionView, TapView } from './speed-engine.ts';
import type { GameProps } from './types.ts';
import './speed.css';

const pointerToken = (event: PointerEvent) => `pointer:${event.pointerId}`;
const keyToken = (event: KeyboardEvent) => `key:${event.key}`;
const activationKey = (event: KeyboardEvent) => event.key === ' ' || event.key === 'Enter';

function useGuardedView<T extends { blocked: boolean }>(publish: (view: T) => void, scope: (view: T) => string | undefined, props: GameProps) {
  const owner = {};
  let currentScope: string | undefined;
  onCleanup(() => setRestartBlocked(owner, false));
  return (view: T) => {
    setRestartBlocked(owner, view.blocked);
    const nextScope = scope(view);
    if (nextScope && nextScope !== currentScope) { currentScope = nextScope; props.onScopeChange?.(nextScope); }
    publish(view);
  };
}

function useViewClock<T extends { phase: string }>(publish: (view: T) => void, tick: () => void, delay: number) {
  let timer = 0;
  onCleanup(() => window.clearTimeout(timer));
  return (view: T) => {
    publish(view);
    if (view.phase === 'running' && !document.hidden) {
      if (!timer) timer = window.setTimeout(() => { timer = 0; tick(); }, delay);
    } else { window.clearTimeout(timer); timer = 0; }
  };
}

function usePressEvents(options: {
  down: (press: Press, event: Event) => void;
  release: (token: string, cancelled: boolean) => void;
  cancel: () => void;
  invalidate?: (token: string) => void;
  held: Set<string>;
  surface: () => HTMLElement | undefined;
  accessibleClick?: boolean;
}) {
  let lastRelease = -Infinity;
  const hidden = () => document.hidden;
  const pointerdown = (event: PointerEvent) => {
    if (hidden() || event.button !== 0 || !['mouse', 'touch', 'pen'].includes(event.pointerType)) return;
    if (event.pointerType === 'mouse' && 'sourceCapabilities' in event && (event.sourceCapabilities as { firesTouchEvents?: boolean } | null)?.firesTouchEvents) return;
    event.preventDefault();
    if (event.target instanceof Element) event.target.closest('button')?.focus({ preventScroll: true });
    options.down({ token: pointerToken(event), kind: event.pointerType as Press['kind'] }, event);
  };
  const keydown = (event: KeyboardEvent) => {
    if (!activationKey(event)) return;
    event.preventDefault();
    if (hidden() || event.repeat) return;
    options.down({ token: keyToken(event), kind: 'keyboard' }, event);
  };
  const click = (event: MouseEvent) => {
    event.preventDefault();
    if (!options.accessibleClick || hidden() || event.detail !== 0 || options.held.size || performance.now() - lastRelease < 500) return;
    const token = 'accessible-click';
    options.down({ token, kind: 'keyboard' }, event);
    options.release(token, false);
  };
  onSettled(() => {
    const release = (event: PointerEvent) => { lastRelease = performance.now(); options.release(pointerToken(event), event.type !== 'pointerup'); };
    const keyup = (event: KeyboardEvent) => {
      if (!activationKey(event)) return;
      if (options.held.has(keyToken(event))) event.preventDefault();
      lastRelease = performance.now(); options.release(keyToken(event), false);
    };
    const lost = (event: PointerEvent) => { if (event.target === options.surface()) release(event); };
    const move = (event: PointerEvent) => {
      const surface = options.surface();
      if (!surface || !options.invalidate || !options.held.has(pointerToken(event))) return;
      const rect = surface.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) options.invalidate(pointerToken(event));
    };
    const visibility = () => { if (document.hidden) options.cancel(); };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('lostpointercapture', lost);
    window.addEventListener('pointermove', move);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', options.cancel);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('lostpointercapture', lost);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', options.cancel);
      document.removeEventListener('visibilitychange', visibility);
    };
  });
  return { pointerdown, keydown, click };
}

function Reaction(props: GameProps) {
  const timers = useTimers();
  const [view, setView] = createSignal<ReactionView>({ phase: 'ready', trial: 1, sample: 0, average: 0, input: null, blocked: false, message: '' });
  const updateView = useGuardedView<ReactionView>(setView, view => view.input ? reactionScope(view.input) : undefined, props);
  const engine = new ReactionEngine({ now: () => performance.now(), after: timers.after, clear: timers.clear }, updateView, result => props.onFinish(result));
  let pad: HTMLButtonElement | undefined;
  const events = usePressEvents({
    down: (press, event) => {
      engine.down(press);
      if (press.kind === 'touch' && event instanceof PointerEvent && engine.snapshot().phase === 'waiting') {
        try { pad?.setPointerCapture(event.pointerId); } catch { /* The pointer may already have been cancelled. */ }
      }
    },
    release: (token, cancelled) => engine.release(token, cancelled), cancel: () => engine.interrupt(), invalidate: token => engine.invalidate(token), held: engine.guard.held, surface: () => pad, accessibleClick: true,
  });
  onCleanup(() => engine.dispose());
  const label = () => {
    const current = view();
    if (current.phase === 'waiting') return current.input === 'touch' ? 'Keep holding...' : 'Wait...';
    if (current.phase === 'go') return current.input === 'touch' ? 'Release now' : 'Tap now';
    if (current.phase === 'early') return 'Too soon';
    if (current.phase === 'between') return `${current.sample} ms`;
    if (current.phase === 'result') return `${current.average} ms`;
    return 'Ready?';
  };
  const instruction = () => {
    const current = view();
    if (current.phase === 'ready') return 'Click or press Space to begin. On touch, hold until green.';
    if (current.phase === 'waiting') return 'Wait for green';
    if (current.phase === 'go') return current.input === 'touch' ? 'Lift your finger' : 'Click or press Space';
    if (current.phase === 'result') return current.input === 'touch' ? 'Five-trial average · Hold to play again' : 'Five-trial average · Play again';
    return current.input === 'touch' ? 'Hold when ready for the next trial' : 'Click when ready for the next trial';
  };
  return <div class="ai-speed ai-reaction-game" data-state={view().phase}>
    <Stats items={[{ label: 'Trial', value: `${view().trial} / 5` }, { label: 'Protocol', value: view().input === 'touch' ? 'Touch release' : view().input === 'pen' ? 'Pen press' : 'Mouse / keyboard' }]}/>
    <p class="ai-speed-feedback" aria-live="polite">{view().message}</p>
    <button ref={pad} type="button" class={['ai-reaction-pad', { 'is-waiting': view().phase === 'waiting', 'is-go': view().phase === 'go', 'is-result': ['between', 'early', 'result'].includes(view().phase) }]} aria-disabled={view().blocked ? 'true' : undefined} onPointerDown={events.pointerdown} onKeyDown={events.keydown} onClick={events.click}>
      <strong role={['between', 'early', 'result'].includes(view().phase) ? 'status' : undefined}>{label()}</strong><span>{instruction()}</span>
    </button>
  </div>;
}

function Tapping(props: GameProps) {
  const timers = useTimers();
  const [view, setView] = createSignal<TapView>({ phase: 'ready', count: 0, remaining: 10000, input: null, practice: false, blocked: false, message: '' });
  const publishView = useGuardedView<TapView>(setView, view => view.input && !view.practice ? view.input === 'mouse' ? 'cps-v1-mouse-10s' : 'tps-v3-touch-10s' : undefined, props);
  const updateView = useViewClock<TapView>(publishView, () => engine.tick(), 50);
  const engine = new TapEngine({ now: () => performance.now(), after: timers.after, clear: timers.clear }, updateView, result => props.onFinish(result));
  let pad: HTMLButtonElement | undefined;
  const events = usePressEvents({ down: press => engine.down(press), release: token => engine.release(token), cancel: () => { if (engine.snapshot().phase === 'running') engine.cancel(); else { engine.guard.interrupt(); engine.release('interrupted'); } }, held: engine.guard.held, surface: () => pad });
  onCleanup(() => engine.dispose());
  const countLabel = () => view().practice ? 'Key presses' : view().input === 'mouse' ? 'Clicks' : view().input === 'touch' ? 'Taps' : 'Count';
  return <div class="ai-speed ai-tapping-game" data-state={view().phase}>
    <Stats items={view().phase === 'result' ? [{ label: 'Rate', value: `${(view().count / 10).toFixed(2)} / s` }, { label: countLabel(), value: view().count }, { label: 'Time', value: '10.0s' }] : [{ label: countLabel(), value: view().count }, { label: 'Time', value: `${(Math.ceil(view().remaining / 100) / 10).toFixed(1)}s` }]}/>
    <p class="ai-speed-feedback" aria-live="polite">{view().practice ? 'Keyboard practice · not saved' : view().message}</p>
    <button ref={pad} class="ai-tap-pad" type="button" disabled={view().blocked} onPointerDown={events.pointerdown} onKeyDown={events.keydown} onClick={events.click}>
      <Show when={view().phase === 'result'} fallback={<><strong>{view().phase === 'ready' ? view().practice ? 'Press Space or Enter' : 'Click or tap to begin' : view().practice ? 'Press' : view().input === 'mouse' ? 'Click' : 'Tap'}</strong><span>{view().phase === 'ready' ? 'Ten seconds. Input is detected automatically.' : 'Keep going'}</span></>}>
        <strong role="status">{(view().count / 10).toFixed(2)} {view().practice ? 'keys' : view().input === 'mouse' ? 'clicks' : 'taps'} / s</strong><span>Play again</span>
      </Show>
    </button>
    <Button class="ai-speed-practice" aria-pressed={view().practice ? 'true' : 'false'} onClick={() => { engine.togglePractice(); pad?.focus({ preventScroll: true }); }}>{view().practice ? 'Return to click / tap test' : 'Keyboard practice'}</Button>
  </div>;
}

function TargetIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/></svg>; }
function Aim(props: GameProps) {
  const timers = useTimers();
  const [view, setView] = createSignal<AimView>({ phase: 'ready', hits: 0, misses: 0, elapsed: 0, score: 0, input: null, format: 'compact', target: null, outgoing: [], blocked: false, message: '' });
  const publishView = useGuardedView<AimView>(setView, view => aimScope(view.input ?? 'mouse', view.format), props);
  const updateView = useViewClock<AimView>(publishView, () => engine.tick(), 100);
  const engine = new AimEngine({ now: () => performance.now(), after: timers.after, clear: timers.clear }, updateView, result => props.onFinish(result));
  let arena: HTMLDivElement | undefined;
  let restoreFocus = false;
  const events = usePressEvents({
    down: (press, event) => {
      if (!arena) return;
      const hit = event.target instanceof Element && !!event.target.closest('.ai-aim-target');
      restoreFocus = press.kind === 'keyboard' || hit && event.target === document.activeElement;
      if (!engine.geometry(arena.clientWidth, arena.clientHeight)) return;
      engine.down(press, hit);
    }, release: token => engine.release(token), cancel: () => { if (engine.snapshot().phase === 'running') engine.cancel(); else { engine.guard.interrupt(); engine.release('interrupted'); } }, held: engine.guard.held, surface: () => arena, accessibleClick: true,
  });
  onSettled(() => {
    if (!arena) return;
    engine.geometry(arena.clientWidth, arena.clientHeight);
    const observer = new ResizeObserver(() => { if (arena) engine.geometry(arena.clientWidth, arena.clientHeight); });
    observer.observe(arena);
    return () => { observer.disconnect(); };
  });
  onCleanup(() => engine.dispose());
  function Target(props: { x: number; y: number }) {
    let button: HTMLButtonElement | undefined;
    onSettled(() => { if (restoreFocus && !document.hidden) button?.focus({ preventScroll: true }); });
    return <button ref={button} type="button" class={['ai-aim-target', { 'is-retry': view().phase === 'result' }]} style={{ left: `${props.x}px`, top: `${props.y}px` }} disabled={view().blocked} aria-label={view().phase === 'result' ? 'Play aim training again' : `Target ${view().hits + 1} of 30`} onKeyDown={events.keydown}><TargetIcon/></button>;
  }
  return <div class="ai-speed ai-aim-game" data-state={view().phase}>
    <Stats items={[{ label: view().phase === 'result' ? 'ms / target' : 'Targets', value: view().phase === 'result' ? view().score : `${view().hits} / 30` }, { label: 'Time', value: `${(view().elapsed / 1000).toFixed(view().phase === 'result' ? 2 : 1)}s` }, { label: 'Misses', value: view().misses }]}/>
    <div class="ai-aim-progress" aria-hidden="true"><span style={{ transform: `scaleX(${view().hits / 30})` }}/></div>
    <p class="ai-speed-feedback" aria-live="polite">{view().phase === 'result' ? `${view().score} ms per target · ${view().input} · ${view().format} board` : view().message}</p>
    <div ref={arena} class="ai-aim-arena" data-aim-format={view().format} onPointerDown={events.pointerdown} onClick={events.click}>
      <For each={view().outgoing}>{point => <span class="ai-aim-exit" style={{ left: `${point.x}px`, top: `${point.y}px` }} aria-hidden="true"><TargetIcon/></span>}</For>
      <Show when={view().target} fallback={<><button class="ai-aim-target is-start" type="button" aria-label="Start aim training" onKeyDown={events.keydown}><TargetIcon/></button><span class="ai-aim-note">Hit the target to start</span></>}>
        <For each={view().target ? [view().target!] : []}>{point => <Target x={point.x} y={point.y}/>}</For>
      </Show>
      <Show when={view().phase === 'result'}><span class="ai-aim-retry-note">Hit the target to play again</span></Show>
    </div>
    <p class="ai-speed-note">{view().format === 'standard' ? 'Standard board · 970 × 500' : 'Compact board'} · 30 targets · Input methods have separate histories.</p>
  </div>;
}

export function SpeedGame(props: GameProps) {
  if (props.id === 'reaction') return <Reaction {...props}/>;
  if (props.id === 'aim') return <Aim {...props}/>;
  return <Tapping {...props}/>;
}
