import type { GameResult, InputKind } from './types.ts';

export type Press = { token: string; kind: InputKind };
export type Clock = { now: () => number; after: (fn: () => void, ms: number) => unknown; clear: () => void };
export const RESULT_DELAY = 750;
export const reactionScope = (kind: InputKind | 'mixed') => kind === 'touch' ? 'reaction-v7-touch-release' : `reaction-v7-${kind === 'pen' ? 'pen' : 'desktop'}`;
export const aimScope = (kind: InputKind, format: 'standard' | 'compact') => `aim-${kind === 'touch' || kind === 'keyboard' ? 'v6' : 'v4'}-${format}-${kind}`;

/** Old finishing presses must release; only Reaction can retain one fresh retry intent. */
export class PressGuard {
  readonly held = new Set<string>();
  private old = new Set<string>();
  private until = 0;
  private pending: Press | undefined;
  private enabled = false;
  private allowHeld = false;
  constructor(private now: () => number, private resume: (press: Press) => void) {}
  get blocked() { return this.enabled && (this.now() < this.until || this.held.size > 0); }
  get pendingToken() { return this.pending?.token; }
  begin(allowHeld = false) {
    this.old = new Set(this.held);
    this.until = this.now() + RESULT_DELAY;
    this.enabled = true;
    this.allowHeld = allowHeld;
    this.pending = undefined;
  }
  down(press: Press) {
    if (this.held.has(press.token)) return false;
    const previousHeld = this.held.size;
    this.held.add(press.token);
    if (!this.enabled) return true;
    if (this.now() >= this.until && !this.old.size && !previousHeld) {
      this.enabled = false;
      return true;
    }
    if (this.allowHeld && !this.pending && ![...this.held].some(token => token !== press.token && !this.old.has(token))) this.pending = press;
    return false;
  }
  release(token: string) {
    this.held.delete(token);
    this.old.delete(token);
    if (this.pending?.token === token) this.pending = undefined;
    this.tick();
  }
  invalidate(token?: string) {
    if (!token || this.pending?.token === token) this.pending = undefined;
  }
  interrupt() { this.held.clear(); this.old.clear(); this.pending = undefined; }
  tick() {
    if (!this.enabled || this.now() < this.until || this.old.size || !this.pending || this.held.size !== 1 || !this.held.has(this.pending.token)) return;
    const press = this.pending;
    this.pending = undefined;
    this.enabled = false;
    this.resume(press);
  }
  reset() { this.held.clear(); this.old.clear(); this.pending = undefined; this.enabled = false; }
}

type ReactionPhase = 'ready' | 'waiting' | 'go' | 'between' | 'early' | 'result';
export type ReactionView = { phase: ReactionPhase; trial: number; sample: number; average: number; input: InputKind | 'mixed' | null; blocked: boolean; message: string };
export class ReactionEngine {
  readonly guard: PressGuard;
  private phase: ReactionPhase = 'ready';
  private samples: number[] = [];
  private input: InputKind | 'mixed' | null = null;
  private scope = '';
  private touchToken: string | undefined;
  private began = 0;
  private message = '';
  constructor(private clock: Clock, private changed: (view: ReactionView) => void, private finish: (result: GameResult) => void, private random = Math.random) {
    this.guard = new PressGuard(clock.now, press => { this.activate(press); this.emit(); });
  }
  snapshot(): ReactionView {
    return { phase: this.phase, trial: Math.min(5, this.samples.length + 1), sample: this.samples.at(-1) ?? 0, average: Math.round(this.samples.reduce((a, b) => a + b, 0) / (this.samples.length || 1)), input: this.input, blocked: this.guard.blocked, message: this.message };
  }
  private emit() { this.changed(this.snapshot()); }
  private accept(kind: InputKind) { return !this.scope || reactionScope(kind) === this.scope; }
  private wait(press: Press) {
    this.clock.clear();
    this.phase = 'waiting'; this.message = '';
    this.touchToken = press.kind === 'touch' ? press.token : undefined;
    this.clock.after(() => { if (this.phase !== 'waiting') return; this.began = this.clock.now(); this.phase = 'go'; this.emit(); }, 1000 + Math.floor(this.random() * 1501));
  }
  private activate(press: Press) {
    if (!this.accept(press.kind) && this.phase !== 'result') return;
    if (this.phase === 'ready' || this.phase === 'result') {
      this.samples = []; this.input = press.kind; this.scope = reactionScope(press.kind);
      this.wait(press);
    } else if (this.phase === 'early' || this.phase === 'between') {
      if (press.kind !== this.input) this.input = 'mixed';
      this.wait(press);
    } else if (press.kind !== 'touch') {
      if (press.kind !== this.input) this.input = 'mixed';
      this.respond();
    }
  }
  down(press: Press) {
    const oldHeld = this.guard.held.size;
    const guarded = ['early', 'between', 'result'].includes(this.phase);
    if (!this.accept(press.kind) && this.phase !== 'result') return;
    if (this.guard.down(press) && (!oldHeld || guarded)) this.activate(press);
    this.emit();
  }
  release(token: string, cancelled = false) {
    const responds = this.touchToken === token;
    if (responds) this.touchToken = undefined;
    this.guard.release(token);
    if (responds) {
      if (cancelled) this.cancel();
      else this.respond();
    }
    this.emit();
  }
  private respond() {
    if (this.phase !== 'waiting' && this.phase !== 'go') return;
    const now = this.clock.now();
    this.clock.clear();
    if (this.phase === 'waiting') { this.phase = 'early'; this.message = this.input === 'touch' ? 'Early release. This trial does not count.' : 'Early press. This trial does not count.'; }
    else {
      this.samples.push(Math.round(now - this.began));
      this.phase = this.samples.length === 5 ? 'result' : 'between';
      if (this.phase === 'result') this.finish({ value: this.snapshot().average, scope: this.scope, unit: 'ms', lowerIsBetter: true, details: { inputKind: this.input ?? 'mouse', rulesVersion: 7, waitMinMs: 1000, waitMaxMs: 2500, inputFormat: this.input === 'touch' ? 'touch-release' : this.scope.split('-').at(-1) ?? 'desktop', trials: 5 } });
    }
    this.guard.begin(true);
    this.clock.after(() => { this.guard.tick(); this.emit(); }, RESULT_DELAY);
  }
  invalidate(token?: string) { this.guard.invalidate(token); this.emit(); }
  interrupt() {
    if (this.phase === 'waiting' || this.phase === 'go') this.cancel();
    else { this.guard.interrupt(); this.emit(); }
  }
  cancel() {
    this.clock.clear(); this.guard.reset(); this.touchToken = undefined;
    this.phase = 'ready'; this.samples = []; this.input = null; this.scope = ''; this.message = 'Run cancelled. Start when ready.';
    this.emit();
  }
  dispose() { this.clock.clear(); this.guard.reset(); }
}

export type TapView = { phase: 'ready' | 'running' | 'result'; count: number; remaining: number; input: 'mouse' | 'touch' | 'keyboard' | null; practice: boolean; blocked: boolean; message: string };
export class TapEngine {
  readonly guard: PressGuard;
  private phase: TapView['phase'] = 'ready';
  private count = 0;
  private deadline = 0;
  private input: TapView['input'] = null;
  private practice = false;
  private message = '';
  constructor(private clock: Clock, private changed: (view: TapView) => void, private finished: (result: GameResult) => void) { this.guard = new PressGuard(clock.now, () => {}); }
  snapshot(): TapView { return { phase: this.phase, count: this.count, remaining: this.phase === 'running' ? Math.max(0, this.deadline - this.clock.now()) : 10000, input: this.input, practice: this.practice, blocked: this.guard.blocked, message: this.message }; }
  private emit() { this.changed(this.snapshot()); }
  down(press: Press) {
    if (this.practice ? press.kind !== 'keyboard' : press.kind !== 'touch' && press.kind !== 'mouse') return;
    if (this.phase === 'running' && this.clock.now() >= this.deadline) { this.guard.held.add(press.token); this.complete(); return; }
    if (this.phase === 'running' && press.kind !== this.input) return;
    if (!this.guard.down(press)) { this.emit(); return; }
    if (this.phase !== 'running') {
      this.phase = 'running'; this.count = 0; this.input = press.kind as TapView['input']; this.deadline = this.clock.now() + 10000; this.message = '';
      this.clock.after(() => this.complete(), 10000);
    }
    this.count++; this.emit();
  }
  tick() { if (this.phase === 'running' && this.clock.now() >= this.deadline) this.complete(); else this.emit(); }
  release(token: string) { this.guard.release(token); this.emit(); }
  private complete() {
    if (this.phase !== 'running') return;
    this.clock.clear(); this.phase = 'result'; this.guard.begin();
    if (!this.practice) this.finished({ value: this.count / 10, scope: this.input === 'mouse' ? 'cps-v1-mouse-10s' : 'tps-v3-touch-10s', unit: this.input === 'mouse' ? 'clicks / s' : 'taps / s', details: { count: this.count, duration: 10, inputKind: this.input ?? 'touch', rulesVersion: this.input === 'touch' ? 3 : 1 } });
    this.clock.after(() => this.emit(), RESULT_DELAY); this.emit();
  }
  togglePractice() { this.cancel(); this.practice = !this.practice; this.message = ''; this.emit(); }
  cancel() { this.clock.clear(); this.guard.reset(); this.phase = 'ready'; this.count = 0; this.input = null; this.message = 'Run cancelled. No result saved.'; this.emit(); }
  dispose() { this.clock.clear(); this.guard.reset(); }
}

export type AimPoint = { x: number; y: number; serial: number };
export type AimView = { phase: 'ready' | 'running' | 'result'; hits: number; misses: number; elapsed: number; score: number; input: InputKind | null; format: 'standard' | 'compact'; target: AimPoint | null; outgoing: AimPoint[]; blocked: boolean; message: string };
export class AimEngine {
  readonly guard: PressGuard;
  private phase: AimView['phase'] = 'ready';
  private hits = 0;
  private misses = 0;
  private began = 0;
  private appeared = 0;
  private measured = 0;
  private elapsed = 0;
  private input: InputKind | null = null;
  private format: 'standard' | 'compact' = 'compact';
  private width = 400;
  private height = 340;
  private serial = 0;
  private target: AimPoint | null = null;
  private outgoing: AimPoint[] = [];
  private message = '';
  constructor(private clock: Clock, private changed: (view: AimView) => void, private finish: (result: GameResult) => void, private random = Math.random) { this.guard = new PressGuard(clock.now, () => {}); }
  snapshot(): AimView { return { phase: this.phase, hits: this.hits, misses: this.misses, elapsed: this.phase === 'running' ? this.clock.now() - this.began : this.elapsed, score: Math.round(this.measured / 30), input: this.input, format: this.format, target: this.target, outgoing: [...this.outgoing], blocked: this.guard.blocked, message: this.message }; }
  private emit() { this.changed(this.snapshot()); }
  geometry(width: number, height: number) {
    if (width <= 0 || height <= 0) return false;
    if (width === this.width && height === this.height) return true;
    const interrupted = this.phase === 'running';
    if (interrupted) { this.cancel(); this.message = 'Size changed. Start a fresh run.'; }
    this.width = width; this.height = height; this.format = width === 970 && height === 500 ? 'standard' : 'compact'; this.target = null; this.emit();
    return !interrupted;
  }
  private next() {
    const standard = this.format === 'standard', inset = standard ? 50 : 18, top = standard ? 50 : 82, diameter = standard ? 100 : 52;
    this.appeared = this.clock.now();
    this.target = { x: inset + this.random() * Math.max(0, this.width - diameter - 2 * inset), y: top + this.random() * Math.max(0, this.height - diameter - top - inset), serial: ++this.serial };
  }
  down(press: Press, hit = true) {
    if (!this.guard.down(press)) { this.emit(); return; }
    if (this.phase === 'running' && press.kind !== this.input) { this.message = `This run uses ${this.input}. Restart to switch.`; this.emit(); return; }
    if (!hit) { if (this.phase === 'running') this.misses++; this.emit(); return; }
    if (this.phase !== 'running') {
      this.clock.clear(); this.phase = 'running'; this.hits = this.misses = this.measured = this.elapsed = 0; this.input = press.kind; this.began = this.clock.now(); this.message = ''; this.outgoing = []; this.next(); this.emit(); return;
    }
    this.message = ''; this.measured += this.clock.now() - this.appeared; this.hits++;
    if (this.hits === 30) {
      this.elapsed = this.clock.now() - this.began; this.phase = 'result'; this.outgoing = []; this.guard.begin();
      this.finish({ value: Math.round(this.measured / 30), scope: aimScope(press.kind, this.format), unit: 'ms / target', lowerIsBetter: true, details: { inputKind: press.kind, rulesVersion: press.kind === 'touch' || press.kind === 'keyboard' ? 6 : 4, boardFormat: this.format, misses: this.misses, elapsed: this.elapsed / 1000, targets: 30 } });
      this.clock.after(() => this.emit(), RESULT_DELAY);
    } else {
      const old = this.target;
      if (old) { this.outgoing = [...this.outgoing.slice(-3), old]; this.clock.after(() => { this.outgoing = this.outgoing.filter(point => point !== old); this.emit(); }, 120); }
      this.next();
    }
    this.emit();
  }
  tick() { if (this.phase === 'running') this.emit(); }
  release(token: string) { this.guard.release(token); this.emit(); }
  cancel() { this.clock.clear(); this.guard.reset(); this.phase = 'ready'; this.target = null; this.outgoing = []; this.hits = this.misses = this.measured = this.elapsed = 0; this.input = null; this.message = 'Run cancelled. Start when ready.'; this.emit(); }
  dispose() { this.clock.clear(); this.guard.reset(); }
}
