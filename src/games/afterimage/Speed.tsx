import { For, Show, createSignal, onCleanup, onSettled } from 'solid-js';
import { Button } from '../../shared/components/Button.tsx';
import { topLayer } from '../../shared/overlay.ts';
import { Result, Stats, setRestartBlocked, useGameContextMenu, useGameLayerInterrupt, useTimers } from './common.tsx';
import { GameRules } from './GameRules.tsx';
import { AimEngine, ReactionEngine, TapEngine, aimScope, reactionScope } from './speed-engine.ts';
import type { AimView, Press, ReactionView, TapView } from './speed-engine.ts';
import type { GameProps, GameResult } from './types.ts';
import { isVirtualClick } from './press-input.ts';
import './speed.css';

const pointerToken = (event: PointerEvent) => `pointer:${event.pointerId}`;
const keyToken = (event: KeyboardEvent) => `key:${event.key}`;
const activationKey = (event: KeyboardEvent) => event.key === ' ' || event.key === 'Enter';

function focusSpeedControl(element: HTMLElement | undefined | null) {
  if (!element?.isConnected || document.hidden || topLayer()) return;
  if (document.activeElement !== document.body && !element.closest('.ai-speed')?.contains(document.activeElement)) return;
  element.focus({ preventScroll: true });
}

function useGuardedView<T extends { blocked: boolean; phase: string }>(publish: (view: T) => void, scope: (view: T) => string | undefined, props: GameProps) {
  const owner = {};
  let currentScope: string | undefined;
  let active = false;
  onSettled(() => { props.onActivityChange?.(false); });
  onCleanup(() => setRestartBlocked(owner, false));
  return (view: T) => {
    setRestartBlocked(owner, view.blocked);
    const nextActive = view.phase !== 'ready';
    if (active !== nextActive) { active = nextActive; props.onActivityChange?.(active); }
    const nextScope = scope(view);
    if (view.phase !== 'result' && nextScope && nextScope !== currentScope) { currentScope = nextScope; props.onScopeChange?.(nextScope); }
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
  inactive: () => boolean;
}) {
  let lastRelease = -Infinity;
  useGameContextMenu(options.surface, () => !options.inactive());
  useGameLayerInterrupt(options.cancel);
  const unavailable = () => document.hidden || !!topLayer();
  const pointerdown = (event: PointerEvent) => {
    if (options.inactive() || unavailable() || event.button !== 0 || !['mouse', 'touch', 'pen'].includes(event.pointerType)) return;
    if (event.pointerType === 'mouse' && 'sourceCapabilities' in event && (event.sourceCapabilities as { firesTouchEvents?: boolean } | null)?.firesTouchEvents) return;
    event.preventDefault();
    if (event.target instanceof Element) event.target.closest('button')?.focus({ preventScroll: true });
    options.down({ token: pointerToken(event), kind: event.pointerType as Press['kind'] }, event);
  };
  const keydown = (event: KeyboardEvent) => {
    if (options.inactive() || unavailable() || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.isComposing || !activationKey(event)) return;
    event.preventDefault();
    if (event.repeat) return;
    options.down({ token: keyToken(event), kind: 'keyboard' }, event);
  };
  const click = (event: MouseEvent) => {
    if (options.inactive() || unavailable() || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
    event.preventDefault();
    if (!options.accessibleClick || !isVirtualClick(event) || options.held.size || performance.now() - lastRelease < 500) return;
    const token = 'accessible-click';
    options.down({ token, kind: 'keyboard' }, event);
    options.release(token, false);
  };
  onSettled(() => {
    const release = (event: PointerEvent) => {
      lastRelease = performance.now();
      // A captured touch release must never score a covered Reaction trial.
      if (unavailable()) { options.cancel(); return; }
      options.release(pointerToken(event), event.type !== 'pointerup');
    };
    const keyup = (event: KeyboardEvent) => {
      if (!activationKey(event)) return;
      if (unavailable()) { options.cancel(); return; }
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
  const [result, setResult] = createSignal<GameResult | null>(null);
  const [view, setView] = createSignal<ReactionView>({ phase: 'ready', trial: 1, sample: 0, average: 0, input: null, blocked: false, message: '' });
  const updateView = useGuardedView<ReactionView>(setView, view => view.input ? reactionScope(view.input) : undefined, props);
  const engine = new ReactionEngine({ now: () => performance.now(), after: timers.after, clear: timers.clear }, updateView, result => { setResult(result); props.onFinish(result); });
  let pad: HTMLButtonElement | undefined;
  const events = usePressEvents({
    inactive: () => engine.snapshot().phase === 'result',
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
    if (current.phase === 'result') return '';
    return 'Ready?';
  };
  const instruction = () => {
    const current = view();
    if (current.phase === 'ready') return 'Click or press Space to begin.';
    if (['waiting', 'go', 'result'].includes(current.phase)) return '';
    return current.input === 'touch' ? 'Hold when ready for the next trial' : 'Click when ready for the next trial';
  };
  return <div class="ai-speed ai-reaction-game" data-state={view().phase}>
    <Stats items={[{ label: view().phase === 'result' ? 'Average' : 'Trial', value: view().phase === 'result' ? `${view().average} ms` : `${view().trial} / 5` }, { label: 'Protocol', value: view().input === 'touch' ? 'Touch release' : view().input === 'pen' ? 'Pen press' : 'Mouse / keyboard' }]}/>
    <p class="ai-speed-feedback" aria-live="polite">{view().message || undefined}</p>
    <div class="ai-speed-stage">
    <button ref={pad} type="button" data-game-input={view().phase !== 'result' ? '' : undefined} inert={view().phase === 'result'} aria-hidden={view().phase === 'result' ? 'true' : undefined} class={['ai-reaction-pad', { 'is-waiting': view().phase === 'waiting', 'is-go': view().phase === 'go', 'is-result': ['between', 'early', 'result'].includes(view().phase) }]} aria-disabled={view().blocked ? 'true' : undefined} onPointerDown={events.pointerdown} onKeyDown={events.keydown} onClick={events.click}>
      <strong role={['between', 'early', 'result'].includes(view().phase) ? 'status' : undefined}>{label() || undefined}</strong><span>{instruction() || undefined}</span>
    </button>
    <Show when={view().phase === 'result' && result()} keyed>{value => <Result overlay result={value} onRetry={() => { engine.cancel(''); setResult(null); timers.after(() => focusSpeedControl(pad), 0); }}/>}</Show>
    </div>
    <Show when={view().phase === 'ready'}><GameRules detail="The result is your average across five trials. An early response repeats the trial.">Wait for the cue, then click or press Space. On touch, hold the pad and release when the cue appears.</GameRules></Show>
  </div>;
}

function Tapping(props: GameProps) {
  const timers = useTimers();
  const [view, setView] = createSignal<TapView>({ phase: 'ready', count: 0, remaining: 10000, input: null, practice: false, blocked: false, message: '' });
  const publishView = useGuardedView<TapView>(setView, view => view.input && !view.practice ? view.input === 'mouse' ? 'cps-v1-mouse-10s' : 'tps-v3-touch-10s' : undefined, props);
  const updateView = useViewClock<TapView>(publishView, () => engine.tick(), 50);
  const engine = new TapEngine({ now: () => performance.now(), after: timers.after, clear: timers.clear }, updateView, result => props.onFinish(result));
  let pad: HTMLButtonElement | undefined;
  const events = usePressEvents({ inactive: () => engine.snapshot().phase === 'result', down: press => engine.down(press), release: token => engine.release(token), cancel: () => { if (engine.snapshot().phase === 'running') engine.cancel(); else { engine.guard.interrupt(); engine.release('interrupted'); } }, held: engine.guard.held, surface: () => pad });
  onCleanup(() => engine.dispose());
  const countLabel = () => view().practice ? 'Key presses' : view().input === 'mouse' ? 'Clicks' : view().input === 'touch' ? 'Taps' : 'Count';
  const result = (): GameResult => ({ value: view().count / 10, scope: view().practice ? 'cps-keyboard-practice' : view().input === 'mouse' ? 'cps-v1-mouse-10s' : 'tps-v3-touch-10s', unit: view().practice ? 'keys / s' : view().input === 'mouse' ? 'clicks / s' : 'taps / s' });
  return <div class="ai-speed ai-tapping-game" data-state={view().phase}>
    <Stats items={[{ label: 'Rate', value: `${(view().count / Math.max(0.1, view().phase === 'result' ? 10 : (10000 - view().remaining) / 1000)).toFixed(2)} / s` }, { label: countLabel(), value: view().count }, { label: 'Time', value: view().phase === 'result' ? '10.0s' : `${(Math.ceil(view().remaining / 100) / 10).toFixed(1)}s` }]}/>
    <p class="ai-speed-feedback" aria-live="polite">{view().practice ? 'Keyboard practice · not saved' : view().message || undefined}</p>
    <div class="ai-speed-stage">
    <button ref={pad} class="ai-tap-pad" type="button" data-game-input={view().phase !== 'result' ? '' : undefined} inert={view().phase === 'result'} aria-hidden={view().phase === 'result' ? 'true' : undefined} disabled={view().blocked} onPointerDown={events.pointerdown} onKeyDown={events.keydown} onClick={events.click}>
      <Show when={view().phase !== 'result'}><strong>{view().phase === 'ready' ? view().practice ? 'Press Space or Enter' : 'Click or tap to begin' : view().practice ? 'Press' : view().input === 'mouse' ? 'Click' : 'Tap'}</strong></Show>
    </button>
    <Show when={view().phase === 'result'}><Result overlay result={result()} onRetry={() => { engine.cancel(''); timers.after(() => focusSpeedControl(pad), 0); }}/></Show>
    </div>
    <Show when={view().phase === 'ready'}><GameRules>{view().practice ? 'Press and release Space or Enter as often as you can for 10 seconds. Practice results are not saved.' : 'Click or tap as often as you can for 10 seconds. The first press starts the clock.'}</GameRules></Show>
    <Button class="ai-speed-practice" disabled={view().phase === 'result'} aria-pressed={view().practice ? 'true' : 'false'} onClick={() => { if (document.hidden || topLayer()) return; engine.togglePractice(); pad?.focus({ preventScroll: true }); }}>{view().practice ? 'Return to click / tap test' : 'Keyboard practice'}</Button>
  </div>;
}

function TargetIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/></svg>; }
function Aim(props: GameProps) {
  const timers = useTimers();
  const [result, setResult] = createSignal<GameResult | null>(null);
  const [view, setView] = createSignal<AimView>({ phase: 'ready', hits: 0, misses: 0, elapsed: 0, score: 0, input: null, format: 'compact', target: null, outgoing: [], blocked: false, message: '' });
  const publishView = useGuardedView<AimView>(setView, view => aimScope(view.input ?? 'mouse', view.format), props);
  const updateView = useViewClock<AimView>(publishView, () => engine.tick(), 100);
  const engine = new AimEngine({ now: () => performance.now(), after: timers.after, clear: timers.clear }, updateView, result => { setResult(result); props.onFinish(result); });
  let arena: HTMLDivElement | undefined;
  let restoreFocus = false;
  const events = usePressEvents({
    inactive: () => engine.snapshot().phase === 'result',
    down: (press, event) => {
      if (!arena) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('.ai-aim-target') : null;
      // Solid may still display a consumed target when another finger lands.
      if (target && Number(target.dataset.targetSerial ?? 0) !== (engine.snapshot().target?.serial ?? 0)) return;
      const hit = !!target;
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
  function Target(props: { x: number; y: number; serial: number }) {
    let button: HTMLButtonElement | undefined;
    onSettled(() => { if (restoreFocus) focusSpeedControl(button); });
    return <button ref={button} type="button" class={['ai-aim-target', { 'is-retry': view().phase === 'result' }]} data-target-serial={props.serial} style={{ left: `${props.x}px`, top: `${props.y}px` }} disabled={view().blocked} aria-label={view().phase === 'result' ? 'Play aim training again' : `Target ${view().hits + 1} of 30`} onKeyDown={events.keydown}><TargetIcon/></button>;
  }
  return <div class="ai-speed ai-aim-game" data-state={view().phase}>
    <Stats items={[{ label: view().phase === 'result' ? 'ms / target' : 'Targets', value: view().phase === 'result' ? view().score : `${view().hits} / 30` }, { label: 'Time', value: `${(view().elapsed / 1000).toFixed(view().phase === 'result' ? 2 : 1)}s` }, { label: 'Misses', value: view().misses }]}/>
    <div class="ai-aim-progress" aria-hidden="true"><span style={{ transform: `scaleX(${view().hits / 30})` }}/></div>
    <p class="ai-speed-feedback" aria-live="polite">{view().message || undefined}</p>
    <div class="ai-speed-stage">
    <div ref={arena} class="ai-aim-arena" data-game-input={view().phase !== 'result' ? '' : undefined} inert={view().phase === 'result'} aria-hidden={view().phase === 'result' ? 'true' : undefined} data-aim-format={view().format} onPointerDown={events.pointerdown} onClick={events.click}>
      <Show when={view().target} fallback={<button class="ai-aim-target is-start" type="button" aria-label="Start aim training" onKeyDown={events.keydown}><TargetIcon/></button>}>
        <For each={view().target ? [view().target!] : []}>{point => <Target x={point.x} y={point.y} serial={point.serial}/>}</For>
      </Show>
    </div>
    <Show when={view().phase === 'result' && result()} keyed>{value => <Result overlay result={value} onRetry={() => { engine.cancel(''); setResult(null); timers.after(() => focusSpeedControl(arena?.querySelector('button')), 0); }}/>}</Show>
    </div>
    <Show when={view().phase === 'ready'}><GameRules>Select the centre target to begin, then hit 30 targets as quickly as possible. Misses keep the clock running.</GameRules></Show>
  </div>;
}

export function SpeedGame(props: GameProps) {
  if (props.id === 'reaction') return <Reaction {...props}/>;
  if (props.id === 'aim') return <Aim {...props}/>;
  return <Tapping {...props}/>;
}
