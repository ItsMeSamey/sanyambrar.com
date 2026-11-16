import { For, createEffect, createSignal, onCleanup, onSettled } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Button } from '../../shared/components/Button.tsx';
import { CirclePlay, RotateCw, Trophy } from '../../shared/components/Icons.tsx';
import type { GameResult, InputKind, Stat } from './types.ts';
import { readHistory } from './history.ts';
import { createPointerPresses, isVirtualClick } from './press-input.ts';

export function useGamePress() {
  const pointers = createPointerPresses();
  onSettled(() => {
    const release = (event: PointerEvent) => pointers.release(event.pointerId);
    const visibility = () => { if (document.hidden) pointers.reset(); };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', pointers.reset);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', pointers.reset);
      document.removeEventListener('visibilitychange', visibility);
      pointers.reset();
    };
  });
  return {
    down(event: PointerEvent) {
      if (document.hidden || !pointers.down(event)) return false;
      event.preventDefault();
      return true;
    },
    click: (event: MouseEvent) => !document.hidden && isVirtualClick(event),
  };
}

const heldKeys = new Set<string>(), heldPointers = new Set<number>(), releases = new Set<() => void>();
const pressedAt = new Map<string | number, number>();
let releasedAt = -Infinity, releasedPress = -Infinity;
const restartBlocks = new Set<object>(), restartSubscribers = new Set<(blocked: boolean) => void>();
export const isRestartBlocked = () => restartBlocks.size > 0;
export function setRestartBlocked(owner: object, blocked: boolean) {
  if (blocked) restartBlocks.add(owner); else restartBlocks.delete(owner);
  restartSubscribers.forEach(fn => fn(restartBlocks.size > 0));
}
export function useRestartBlocked() {
  const [blocked, setBlocked] = createSignal(restartBlocks.size > 0);
  restartSubscribers.add(setBlocked);
  onCleanup(() => { restartSubscribers.delete(setBlocked); });
  return blocked;
}
export function installInputTracking() {
  const keydown = (event: KeyboardEvent) => { if (['Enter', ' '].includes(event.key)) { if (!heldKeys.has(event.key) && !event.repeat) pressedAt.set(event.key, performance.now()); heldKeys.add(event.key); } };
  const keyup = (event: KeyboardEvent) => { if (['Enter', ' '].includes(event.key)) { releasedAt = performance.now(); releasedPress = pressedAt.get(event.key) ?? -Infinity; pressedAt.delete(event.key); } heldKeys.delete(event.key); releases.forEach(fn => fn()); };
  const pointerdown = (event: PointerEvent) => { pressedAt.set(event.pointerId, performance.now()); heldPointers.add(event.pointerId); };
  const pointerup = (event: PointerEvent) => { releasedAt = performance.now(); releasedPress = pressedAt.get(event.pointerId) ?? -Infinity; pressedAt.delete(event.pointerId); heldPointers.delete(event.pointerId); releases.forEach(fn => fn()); };
  const blur = () => { heldKeys.clear(); heldPointers.clear(); pressedAt.clear(); releases.forEach(fn => fn()); };
  document.addEventListener('keydown', keydown, true); document.addEventListener('keyup', keyup, true);
  document.addEventListener('pointerdown', pointerdown, true); document.addEventListener('pointerup', pointerup, true); document.addEventListener('pointercancel', pointerup, true);
  window.addEventListener('blur', blur);
  return () => { document.removeEventListener('keydown', keydown, true); document.removeEventListener('keyup', keyup, true); document.removeEventListener('pointerdown', pointerdown, true); document.removeEventListener('pointerup', pointerup, true); document.removeEventListener('pointercancel', pointerup, true); window.removeEventListener('blur', blur); heldKeys.clear(); heldPointers.clear(); };
}

/** Wait for the result delay AND release of carried input, including its native click. */
export function useResultGate(active: () => boolean = () => true) {
  const [ready, setReady] = createSignal(false);
  let openedAt = Infinity;
  createEffect(active, enabled => {
    setReady(false);
    if (!enabled) return;
    const guard = {};
    setRestartBlocked(guard, true);
    let elapsed = false, releaseTimer = 0;
    openedAt = Infinity;
    const unlock = () => { if (elapsed && !heldKeys.size && !heldPointers.size && !document.hidden) { if (!ready()) openedAt = performance.now(); setReady(true); setRestartBlocked(guard, false); } };
    const release = () => { if (document.hidden) { setReady(false); openedAt = Infinity; setRestartBlocked(guard, true); } window.clearTimeout(releaseTimer); releaseTimer = window.setTimeout(unlock, 0); };
    const delay = window.setTimeout(() => { elapsed = true; unlock(); }, 750);
    releases.add(release); document.addEventListener('visibilitychange', release);
    return () => { window.clearTimeout(delay); window.clearTimeout(releaseTimer); releases.delete(release); document.removeEventListener('visibilitychange', release); setRestartBlocked(guard, false); };
  });
  return Object.assign(ready, { accept: (_event?: MouseEvent) => ready() && (performance.now() - releasedAt > 100 || releasedPress >= openedAt || [...pressedAt.values()].some(start => start >= openedAt)) });
}

export function personalBest(result: GameResult): number | null {
  try {
    const values = [result.value, ...readHistory(result.scope).map(row => row.value)];
    if (result.scope.startsWith('visual')) values.push(Number(localStorage.getItem(`afterimage-best-${result.scope}`)) || 0);
    return values.reduce((best, value) => result.lowerIsBetter ? Math.min(best, value) : Math.max(best, value), result.value);
  } catch { return null; }
}

export function Stats(props: { items: Stat[] }) {
  return <div class="ai-stats" aria-label="Current run"><For each={props.items} keyed={item => item.label}>{item => <div class={['ai-stat', item().lives && 'ai-lives']}><span>{item().label}</span>{item().lives ? <strong aria-label={`${item().value} lives`}><For each={Array.from({ length: Math.max(0, Math.min(10, Number(item().value) || 0)) }, (_, index) => index)}>{() => <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 21 3.4 12.6a5.5 5.5 0 0 1 7.8-7.8l.8.8.8-.8a5.5 5.5 0 0 1 7.8 7.8Z"/></svg>}</For></strong> : <strong>{item().value}</strong>}</div>}</For></div>;
}

export function Ready(props: { onStart: () => void; children?: JSX.Element; label?: string; preview?: boolean; overlay?: boolean }) {
  return <section class={['ai-ready', props.preview && 'ai-ready-preview', props.overlay && 'ai-ready-overlay']}><div class="ai-ready-content">{props.children}</div><Button class="ai-primary" onKeyDown={event => { if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault(); }} onClick={props.onStart}><CirclePlay size={20}/>{props.label ?? 'Start'}</Button></section>;
}

export function Result(props: { result: GameResult; onRetry: () => void; children?: JSX.Element; overlay?: boolean }) {
  const ready = useResultGate();
  let retry: HTMLButtonElement | undefined;
  createEffect(ready, enabled => { if (enabled && document.activeElement === document.body) retry?.focus({ preventScroll: true }); });
  const best = () => personalBest(props.result);
  return <section class={['ai-result', props.overlay && 'ai-result-overlay']} aria-label="Run result"><div class="ai-result-panel"><div class="ai-result-score" role="status"><Trophy size={22}/><strong>{props.result.value}</strong><span>{unit(props.result.value, props.result.unit)}</span></div>{best() !== null && <p class="ai-muted">Personal best: {best()} {unit(best() ?? props.result.value, props.result.unit)}</p>}{props.children}<Button ref={retry} class="ai-primary" disabled={!ready()} onClick={event => { if (ready.accept(event)) props.onRetry(); }} onKeyDown={event => { if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault(); }}><RotateCw size={18}/>Play again</Button></div></section>;
}

export function unit(value: number, name: string) {
  const singular: Record<string, string> = { runs: 'run', rounds: 'round', digits: 'digit', levels: 'level', tiles: 'tile', words: 'word', points: 'point', numbers: 'number', lives: 'life' };
  return value === 1 ? singular[name] ?? name : name;
}

export function useTimers() {
  const timeouts = new Set<number>();
  const intervals = new Set<number>();
  function clear() {
    timeouts.forEach(id => window.clearTimeout(id)); intervals.forEach(id => window.clearInterval(id));
    timeouts.clear(); intervals.clear();
  }
  onCleanup(clear);
  return {
    after(fn: () => void, ms: number) { const id = window.setTimeout(() => { timeouts.delete(id); fn(); }, ms); timeouts.add(id); return id; },
    every(fn: () => void, ms: number) { const id = window.setInterval(fn, ms); intervals.add(id); return id; },
    clear,
  };
}

export function inputKind(event: Event): InputKind {
  if ('pointerType' in event && ['mouse', 'touch', 'pen'].includes(String(event.pointerType))) return event.pointerType as InputKind;
  if (event instanceof KeyboardEvent || event instanceof MouseEvent && event.detail === 0) return 'keyboard';
  return 'mouse';
}
