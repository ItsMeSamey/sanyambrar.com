import type { RhythmComposition } from './rhythm-composition.ts';
import type { PreparedRhythmPCM, RhythmPCM, RhythmRenderResponse } from './rhythm-synthesis.ts';
export { composeRhythm, RHYTHM_PALETTES, type RhythmComposition, type RhythmPaletteId } from './rhythm-composition.ts';

export type RhythmPlayback = { startedAtMs: number; durationMs: number };
export type RhythmAudio = {
  unlock: () => Promise<boolean>;
  prepare: (composition: RhythmComposition) => Promise<boolean>;
  play: (composition: RhythmComposition) => RhythmPlayback | null;
  tap: (composition: RhythmComposition, index: number) => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  dispose: () => void;
};
type Voice = { source: AudioBufferSourceNode; gain: GainNode; retiring: boolean };
type Ready = { composition: RhythmComposition; pcm: PreparedRhythmPCM; buffers?: { phrase: AudioBuffer; taps: AudioBuffer[] } };

/** Call unlock directly from a user gesture, prepare during countdown, then play. */
export function createRhythmAudio(): RhythmAudio {
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let limiter: DynamicsCompressorNode | undefined;
  let worker: Worker | undefined;
  let ready: Ready | undefined;
  let pending: { id: number; finish: (success: boolean) => void; timeout: ReturnType<typeof setTimeout> } | undefined;
  let serial = 0;
  let disposed = false;
  let volume = 0.65;
  const voices = new Set<Voice>();
  const unlocking = new Set<(success: boolean) => void>();

  const release = (voice: Voice) => {
    voices.delete(voice);
    voice.source.disconnect();
    voice.gain.disconnect();
  };
  const retire = (voice: Voice) => {
    if (!context || voice.retiring) return;
    voice.retiring = true;
    const now = context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + 0.012);
    try { voice.source.stop(now + 0.015); } catch { release(voice); }
  };
  const cancelPreparation = () => {
    if (pending) {
      clearTimeout(pending.timeout);
      pending.finish(false);
      pending = undefined;
      worker?.terminate();
      worker = undefined;
    }
  };
  const stop = () => {
    for (const finish of unlocking) finish(false);
    cancelPreparation();
    for (const voice of voices) retire(voice);
  };
  const hidden = () => {
    if (document.hidden) {
      stop();
      if (context?.state === 'running') void context.suspend().catch(() => undefined);
    }
  };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', hidden);

  const audioBuffer = (pcm: RhythmPCM) => {
    const buffer = context!.createBuffer(2, pcm.left.length, pcm.sampleRate);
    buffer.copyToChannel(pcm.left, 0);
    buffer.copyToChannel(pcm.right, 1);
    return buffer;
  };
  const buffersFor = (composition: RhythmComposition) => {
    if (!ready || ready.composition !== composition || !context) return undefined;
    if (!ready.buffers) {
      const cache = new Map<RhythmPCM, AudioBuffer>();
      ready.buffers = { phrase: audioBuffer(ready.pcm.phrase), taps: ready.pcm.taps.map(pcm => {
        let buffer = cache.get(pcm);
        if (!buffer) { buffer = audioBuffer(pcm); cache.set(pcm, buffer); }
        return buffer;
      }) };
    }
    return ready.buffers;
  };
  const start = (buffer: AudioBuffer, when: number) => {
    if (!context || !master) return false;
    // Fast input cannot retain an unbounded collection of scheduled sources.
    if (voices.size >= 12) {
      const oldest = voices.values().next().value;
      if (oldest) retire(oldest);
      return false;
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(master);
    const voice = { source, gain, retiring: false };
    voices.add(voice);
    source.onended = () => release(voice);
    source.start(when);
    return true;
  };

  return {
    async unlock() {
      if (disposed || typeof window === 'undefined' || document.hidden) return false;
      try {
        if (!context) {
          const Constructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!Constructor) return false;
          const freshContext = new Constructor({ latencyHint: 'interactive' });
          try {
            const freshMaster = freshContext.createGain();
            const freshLimiter = freshContext.createDynamicsCompressor();
            freshMaster.gain.value = volume;
            freshLimiter.threshold.value = -3;
            freshLimiter.knee.value = 3;
            freshLimiter.ratio.value = 20;
            freshLimiter.attack.value = 0.002;
            freshLimiter.release.value = 0.08;
            freshMaster.connect(freshLimiter);
            freshLimiter.connect(freshContext.destination);
            context = freshContext;
            master = freshMaster;
            limiter = freshLimiter;
          } catch {
            void freshContext.close().catch(() => undefined);
            return false;
          }
        }
        // A suspended clock must not replay the tail of a phrase interrupted while hidden.
        if (context.state !== 'running') for (const voice of voices) if (voice.retiring) {
          voice.source.onended = null;
          try { voice.source.stop(); } catch { /* Already ended. */ }
          release(voice);
        }
        // Resume is invoked in the gesture; some browsers leave a blocked resume pending.
        const resuming = context.resume();
        return await new Promise<boolean>(resolve => {
          const finish = (success: boolean) => {
            clearTimeout(timeout);
            unlocking.delete(finish);
            resolve(success);
          };
          const timeout = setTimeout(() => finish(false), 2500);
          unlocking.add(finish);
          void resuming.then(() => {
            if ((disposed || document.hidden) && context?.state === 'running') void context.suspend().catch(() => undefined);
            finish(!disposed && !document.hidden && context?.state === 'running');
          }, () => finish(false));
        });
      } catch { return false; }
    },
    prepare(composition) {
      if (disposed) return Promise.resolve(false);
      if (ready?.composition === composition) return Promise.resolve(true);
      cancelPreparation();
      ready = undefined;
      const id = ++serial;
      return new Promise<boolean>(resolve => {
        try {
          worker ??= new Worker(new URL('./rhythm-audio-worker.ts', import.meta.url), { type: 'module' });
          const timeout = setTimeout(() => { if (pending?.id === id) cancelPreparation(); }, 3000);
          pending = { id, finish: resolve, timeout };
          worker.onmessage = (event: MessageEvent<RhythmRenderResponse>) => {
            if (disposed || event.data.id !== pending?.id) return;
            const waiting = pending;
            pending = undefined;
            clearTimeout(waiting.timeout);
            if ('pcm' in event.data) ready = { composition, pcm: event.data.pcm };
            waiting.finish('pcm' in event.data);
          };
          worker.onerror = () => { cancelPreparation(); };
          worker.onmessageerror = () => { cancelPreparation(); };
          worker.postMessage({ id, composition });
        } catch { cancelPreparation(); resolve(false); }
      });
    },
    play(composition) {
      if (disposed || !context || context.state !== 'running' || document.hidden) return null;
      try {
        const buffers = buffersFor(composition);
        if (!buffers) return null;
        stop();
        const when = context.currentTime + 0.07;
        const stamp = context.getOutputTimestamp?.();
        const startedAtMs = stamp?.performanceTime && stamp.contextTime !== undefined
          ? stamp.performanceTime + (when - stamp.contextTime) * 1000 + 6
          : performance.now() + (when - context.currentTime + context.baseLatency + (context.outputLatency || 0)) * 1000 + 6;
        if (!start(buffers.phrase, when)) return null;
        return { startedAtMs, durationMs: composition.durationMs };
      } catch { stop(); return null; }
    },
    tap(composition, index) {
      if (disposed || !context || context.state !== 'running' || document.hidden) return;
      try {
        const buffer = buffersFor(composition)?.taps[index];
        if (buffer) start(buffer, context.currentTime);
      } catch { stop(); }
    },
    stop,
    setVolume(next) {
      volume = Number.isFinite(next) ? Math.max(0, Math.min(1, next)) : 0.65;
      if (context && master) master.gain.setTargetAtTime(volume, context.currentTime, 0.015);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      worker?.terminate();
      worker = undefined;
      ready = undefined;
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', hidden);
      for (const voice of voices) {
        voice.source.onended = null;
        try { voice.source.stop(); } catch { /* Already ended. */ }
        release(voice);
      }
      master?.disconnect();
      limiter?.disconnect();
      if (context && context.state !== 'closed') void context.close().catch(() => undefined);
    },
  };
}
