import { rhythmRandom, type RhythmComposition, type RhythmEvent, type RhythmVoice } from './rhythm-composition.ts';

export const RHYTHM_SAMPLE_RATE = 24000;
export type RhythmPCM = { sampleRate: number; left: Float32Array<ArrayBuffer>; right: Float32Array<ArrayBuffer> };
export type PreparedRhythmPCM = { phrase: RhythmPCM; taps: RhythmPCM[] };
const TAU = Math.PI * 2;
const sine = (phase: number) => Math.sin(TAU * phase);
const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const isDrum = (voice: RhythmVoice) => ['kick', 'snare', 'rim', 'hat', 'shaker', 'hand-low', 'hand-high'].includes(voice);

/** The same bounded DSP renders browser buffers and review WAVs. No sampled recordings. */
function renderVoice(event: RhythmEvent, beatSeconds: number, sampleRate: number, seed: number) {
  const voice = event.voice;
  const drum = isDrum(voice);
  const pad = voice === 'chord-pad';
  const sustain = event.durationBeats * beatSeconds;
  const release = pad ? 0.24 : drum ? 0.04 : 0.09;
  const duration = drum ? voice === 'kick' ? 0.42 : voice === 'snare' ? 0.22 : voice.startsWith('hand') ? 0.34 : 0.11 : sustain + release;
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  const hz = frequency(event.midi);
  const attack = pad ? 0.14 : voice === 'reed' ? 0.008 : drum ? 0.0018 : 0.004;
  const random = rhythmRandom(seed);
  let lastNoise = 0;
  for (let i = 0; i < samples.length; i++) {
    const time = i / sampleRate;
    const phase = hz * time;
    const fadeIn = Math.min(1, time / attack);
    const fadeOut = drum ? Math.min(1, (duration - time) / 0.025) : Math.min(1, (duration - time) / release);
    const envelope = fadeIn * Math.max(0, fadeOut);
    let wave: number;
    switch (voice) {
      case 'key':
        wave = sine(phase + 0.19 * Math.exp(-time * 13) * sine(phase * 2)) * Math.exp(-time * 3.5) + 0.12 * sine(phase * 3) * Math.exp(-time * 15); break;
      case 'bell':
        wave = 0.84 * sine(phase) * Math.exp(-time * 4.5) + 0.2 * sine(phase * 2.01) * Math.exp(-time * 9) + 0.08 * sine(phase * 4.03) * Math.exp(-time * 25); break;
      case 'glass':
        wave = 0.76 * sine(phase + 0.11 * Math.exp(-time * 18) * sine(phase * 2.97)) * Math.exp(-time * 3.7) + 0.18 * sine(phase * 2.003) * Math.exp(-time * 8); break;
      case 'pluck':
      case 'chord-pluck':
      case 'bass-pluck': {
        wave = 0;
        const brightness = voice === 'pluck' ? 0.7 : 0.48;
        for (let harmonic = 1; harmonic <= 6; harmonic++) {
          if (hz * harmonic < sampleRate * 0.44) wave += sine(phase * harmonic) * brightness ** (harmonic - 1) * Math.exp(-time * (2.4 + harmonic * 1.8)) / harmonic;
        }
        break;
      }
      case 'clav':
        wave = (sine(phase) * 0.73 + sine(phase * 2) * 0.2 * Math.exp(-time * 7) + sine(phase * 3) * 0.13 * Math.exp(-time * 16) + sine(phase * 5) * 0.06 * Math.exp(-time * 24)) * Math.exp(-time * 5); break;
      case 'mallet':
        wave = sine(phase) * Math.exp(-time * 3.1) + 0.14 * sine(phase * 3.99) * Math.exp(-time * 28); break;
      case 'felt':
        wave = 0.86 * sine(phase) * Math.exp(-time * 4.2) + 0.16 * sine(phase * 2.75) * Math.exp(-time * 25) + 0.08 * sine(phase * 5.4) * Math.exp(-time * 40); break;
      case 'reed':
        wave = (sine(phase) + 0.23 * sine(phase * 2) + 0.07 * sine(phase * 3)) * 0.8 * Math.exp(-time * 4); break;
      case 'chord-key':
        wave = 0.78 * sine(phase + 0.09 * Math.exp(-time * 8) * sine(phase * 2)) * Math.exp(-time * 2.4); break;
      case 'chord-organ':
        wave = (sine(phase) + 0.3 * sine(phase * 2) + 0.1 * sine(phase * 3)) * 0.68 * Math.exp(-time * 2); break;
      case 'chord-pad':
        wave = (sine(phase) + 0.34 * sine(phase * 1.0022) + 0.19 * sine(phase * 1.998)) * 0.56 * (0.9 + 0.1 * sine(time * 0.45)); break;
      case 'bass':
        wave = (sine(phase) + 0.12 * sine(phase * 2)) * Math.exp(-time * 2.7); break;
      case 'bass-synth':
        wave = (sine(phase) + 0.2 * sine(phase * 2) * Math.exp(-time * 6) + 0.08 * sine(phase * 3) * Math.exp(-time * 10)) * Math.exp(-time * 3); break;
      case 'kick':
        wave = sine(47 * time + 3.9 * (1 - Math.exp(-time * 28))) * Math.exp(-time * 13); break;
      case 'hand-low':
      case 'hand-high': {
        const base = voice === 'hand-low' ? 155 : 252;
        wave = (sine(base * time + 0.3 * (1 - Math.exp(-time * 30))) + 0.23 * sine(base * 1.57 * time)) * Math.exp(-time * 19); break;
      }
      case 'rim':
        wave = (sine(1830 * time) * 0.55 + sine(1240 * time) * 0.45) * Math.exp(-time * 95); break;
      case 'snare':
      case 'hat':
      case 'shaker': {
        const noise = random() * 2 - 1;
        const highNoise = noise - lastNoise * 0.82;
        lastNoise = noise;
        wave = voice === 'snare'
          ? (highNoise * 0.6 + sine(time * 185) * 0.4) * Math.exp(-time * 28)
          : highNoise * (voice === 'hat' ? 0.6 : 0.47) * Math.exp(-time * (voice === 'hat' ? 65 : 37));
        break;
      }
    }
    samples[i] = wave * envelope * event.gain;
  }
  return samples;
}

export function renderRhythmPCM(composition: RhythmComposition, options: { sampleRate?: number; stem?: 'full' | 'target' | 'backing' } = {}): RhythmPCM {
  const sampleRate = Math.max(8000, Math.min(48000, Math.round(options.sampleRate ?? RHYTHM_SAMPLE_RATE)));
  const length = Math.ceil(composition.durationMs / 1000 * sampleRate);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const target = new Float32Array(length);
  const beatSeconds = composition.beatMs / 1000;
  for (let index = 0; index < composition.events.length; index++) {
    const event = composition.events[index];
    if (options.stem === 'target' && !event.target || options.stem === 'backing' && event.target) continue;
    const samples = renderVoice(event, beatSeconds, sampleRate, composition.seed + index * 104729);
    const offset = Math.round(event.beat * beatSeconds * sampleRate);
    const pan = Math.max(-1, Math.min(1, event.pan));
    const leftGain = Math.cos((pan + 1) * Math.PI / 4);
    const rightGain = Math.sin((pan + 1) * Math.PI / 4);
    for (let frame = 0; frame < samples.length && frame + offset < length; frame++) {
      if (event.target) target[frame + offset] += samples[frame];
      else {
        left[frame + offset] += samples[frame] * leftGain;
        right[frame + offset] += samples[frame] * rightGain;
      }
    }
    // Only harmony gets room reflections: a target never creates a second apparent tap.
    if (event.voice.startsWith('chord')) {
      for (const [delay, gain, side] of [[0.037, 0.15, -1], [0.061, 0.12, 1], [0.113, 0.07, -1]] as const) {
        const reflection = offset + Math.round(delay * sampleRate);
        const channel = side < 0 ? left : right;
        for (let frame = 0; frame < samples.length && frame + reflection < length; frame++) channel[frame + reflection] += samples[frame] * gain;
      }
    }
  }
  let nextTarget = 0;
  let duckUntil = -1;
  const onsets = composition.targetTimesMs.map(time => Math.round(time / 1000 * sampleRate));
  for (let frame = 0; frame < length; frame++) {
    if (frame >= onsets[nextTarget]) { duckUntil = frame + sampleRate * 0.14; nextTarget++; }
    const duck = frame < duckUntil ? 1 - 0.5 * Math.min(1, (duckUntil - frame) / (sampleRate * 0.1)) : 1;
    const ending = Math.min(1, (length - 1 - frame) / (sampleRate * 0.08));
    // A fixed soft ceiling preserves dynamics without per-phrase loudness surprises.
    left[frame] = 0.94 * Math.tanh((left[frame] * duck + target[frame]) / 0.94) * ending;
    right[frame] = 0.94 * Math.tanh((right[frame] * duck + target[frame]) / 0.94) * ending;
  }
  return { sampleRate, left, right };
}

export function renderPreparedRhythm(composition: RhythmComposition): PreparedRhythmPCM {
  const cache = new Map<string, RhythmPCM>();
  const taps = composition.targetNotes.map(note => {
    const key = `${note.midi}:${note.durationBeats}`;
    let pcm = cache.get(key);
    if (!pcm) {
      const event: RhythmEvent = { ...note, beat: 0, voice: composition.leadVoice, gain: 0.48, pan: 0, target: true };
      pcm = renderRhythmPCM({ ...composition, targetNotes: [{ ...note, beat: 0 }], targetTimesMs: [0], events: [event], durationMs: note.durationBeats * composition.beatMs + 100 });
      cache.set(key, pcm);
    }
    return pcm;
  });
  return { phrase: renderRhythmPCM(composition), taps };
}

export type RhythmRenderRequest = { id: number; composition: RhythmComposition };
export type RhythmRenderResponse = { id: number; pcm: PreparedRhythmPCM } | { id: number; error: string };
