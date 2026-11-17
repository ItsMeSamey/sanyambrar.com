export type RhythmPaletteId = 'velvet' | 'afterhours' | 'circuit' | 'woodland' | 'pocket' | 'drift' | 'sunroom' | 'lantern';
export type RhythmVoice = 'key' | 'bell' | 'pluck' | 'clav' | 'glass' | 'mallet' | 'reed' | 'felt' | 'chord-key' | 'chord-pad' | 'chord-pluck' | 'chord-organ' | 'bass' | 'bass-synth' | 'bass-pluck' | 'kick' | 'snare' | 'rim' | 'hat' | 'shaker' | 'hand-low' | 'hand-high';
export type RhythmNote = { beat: number; midi: number; durationBeats: number };
export type RhythmEvent = RhythmNote & { voice: RhythmVoice; gain: number; pan: number; target: boolean };
type Palette = { id: RhythmPaletteId; name: string; description: string; bpm: number; lead: RhythmVoice; chord: RhythmVoice; bass: RhythmVoice; mode: 'minor' | 'major' | 'soul'; swing: number };
export const RHYTHM_PALETTES: readonly Palette[] = [
  { id: 'velvet', name: 'Velvet', description: 'Warm electric keys and a laid-back pocket', bpm: 84, lead: 'key', chord: 'chord-key', bass: 'bass', mode: 'minor', swing: 0.12 },
  { id: 'afterhours', name: 'Afterhours', description: 'Deep house, soft organ and a steady pulse', bpm: 116, lead: 'bell', chord: 'chord-organ', bass: 'bass-synth', mode: 'minor', swing: 0 },
  { id: 'circuit', name: 'Circuit', description: 'Glassy synths and a broken beat', bpm: 102, lead: 'glass', chord: 'chord-pad', bass: 'bass-synth', mode: 'minor', swing: 0.04 },
  { id: 'woodland', name: 'Woodland', description: 'Wooden plucks, fingerpicked chords and soft shakers', bpm: 92, lead: 'pluck', chord: 'chord-pluck', bass: 'bass-pluck', mode: 'major', swing: 0.03 },
  { id: 'pocket', name: 'Pocket', description: 'Clav keys, muted chords and a syncopated bass', bpm: 108, lead: 'clav', chord: 'chord-key', bass: 'bass-pluck', mode: 'soul', swing: 0.06 },
  { id: 'drift', name: 'Drift', description: 'Floating pads and clear, spacious mallets', bpm: 76, lead: 'mallet', chord: 'chord-pad', bass: 'bass', mode: 'major', swing: 0 },
  { id: 'sunroom', name: 'Sunroom', description: 'Warm reeds, nylon-like strings and hand percussion', bpm: 104, lead: 'reed', chord: 'chord-pluck', bass: 'bass-pluck', mode: 'minor', swing: 0.02 },
  { id: 'lantern', name: 'Lantern', description: 'Felt mallets, bowed textures and low drum accents', bpm: 96, lead: 'felt', chord: 'chord-pad', bass: 'bass', mode: 'minor', swing: 0 },
];
export type RhythmComposition = {
  seed: number; paletteId: RhythmPaletteId; paletteName: string; key: string; bpm: number; beatMs: number;
  targetNotes: RhythmNote[]; targetTimesMs: number[]; durationMs: number; events: RhythmEvent[]; leadVoice: RhythmVoice;
};

export function rhythmRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
const KEYS = [0, 2, 4, 5, 7, 9, 10];
const KEY_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const CONTOURS = [[0, 1, 2, 1, 0, 2, 1, 0], [1, 1, 2, 0, 1, 3, 2, 0], [2, 1, 0, 1, 2, 3, 1, 0], [0, 2, 1, 3, 2, 1, 2, 0]];

/** A seed describes the music, never input latency. Only foreground notes are recall targets. */
export function composeRhythm(options: { seed: number; palette?: RhythmPaletteId; level?: number }): RhythmComposition {
  const seed = Number.isFinite(options.seed) ? options.seed >>> 0 : 0;
  const random = rhythmRandom(seed);
  const choose = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  const palette = RHYTHM_PALETTES.find(item => item.id === options.palette) ?? choose(RHYTHM_PALETTES);
  const rawLevel = options.level ?? 1;
  const level = Number.isFinite(rawLevel) ? Math.max(1, Math.min(40, Math.floor(rawLevel))) : 1;
  const count = Math.min(12, 3 + Math.floor((level - 1) / 2));
  const bpm = palette.bpm + choose([-4, -2, 0, 2, 4]);
  const beatMs = 60000 / bpm;
  const tonic = 48 + choose(KEYS);
  const mode = palette.mode;
  const firstChord = mode === 'major' ? [0, 4, 7, 11, 14] : mode === 'soul' ? [0, 4, 7, 10, 14] : [0, 3, 7, 10, 14];
  const progression = mode === 'major'
    ? choose([{ root: 9, tones: [0, 3, 7, 10, 14] }, { root: 5, tones: [0, 4, 7, 11, 14] }])
    : mode === 'soul'
      ? { root: 5, tones: [0, 4, 7, 10, 14] }
      : choose([{ root: 5, tones: [0, 4, 7, 10, 14] }, { root: 8, tones: [0, 4, 7, 11, 14] }, { root: 3, tones: [0, 4, 7, 11, 14] }]);
  const chords = [{ root: tonic, tones: firstChord }, { root: tonic + progression.root, tones: progression.tones }];
  const contour = choose(CONTOURS);
  const gaps = level < 4 ? [1, 1, 1.5, 2] : level < 9 ? [0.5, 1, 1, 1.5] : [0.5, 0.5, 0.75, 1, 1.5];
  const beats = [0];
  for (let i = 1; i < count; i++) beats.push(beats[i - 1] + choose(gaps));
  const endBeat = Math.max(4, Math.ceil((beats[count - 1] + 0.5) / 4) * 4);
  // Distribute spare half-beats through the phrase so the melody resolves near the barline.
  const spare = Math.max(0, Math.floor((endBeat - 1 - beats[count - 1]) * 2));
  let gapIndex = 1 + Math.floor(random() * (count - 1));
  for (let step = 0; step < spare; step++) {
    for (let index = gapIndex; index < count; index++) beats[index] += 0.5;
    gapIndex = gapIndex % (count - 1) + 1;
  }
  const targetNotes = beats.map((beat, index) => {
    const chord = chords[Math.floor(beat / 4) % 2];
    const degree = index === count - 1 ? 0 : contour[index % contour.length];
    let midi = chord.root + chord.tones[degree] + 24;
    while (midi > 86) midi -= 12;
    while (midi < 71) midi += 12;
    const nextGap = (beats[index + 1] ?? beat + 1) - beat;
    return { beat, midi, durationBeats: Math.min(0.55, nextGap * 0.62) };
  });
  const events: RhythmEvent[] = targetNotes.map(note => ({ ...note, voice: palette.lead, gain: 0.48, pan: 0, target: true }));
  const add = (voice: RhythmVoice, beat: number, midi: number, durationBeats: number, gain: number, pan = 0) => {
    if (beat >= endBeat) return;
    // Backing attacks nearest the melody are quieter; their microtiming never moves a target.
    const nearTarget = beats.some(target => Math.abs(target - beat) < 0.15);
    events.push({ voice, beat, midi, durationBeats, gain: gain * (nearTarget ? 0.62 : 1), pan, target: false });
  };
  for (let bar = 0; bar * 4 < endBeat; bar++) {
    const start = bar * 4;
    const chord = chords[bar % 2];
    const voicing = chord.tones.slice(1).map(tone => {
      let midi = chord.root + tone;
      while (midi > 68) midi -= 12;
      while (midi < 50) midi += 12;
      return midi;
    }).sort((a, b) => a - b);
    const chordBeats = palette.id === 'afterhours' ? [0.5, 2.5] : palette.id === 'pocket' ? [0.5, 2.75] : [0];
    for (const offset of chordBeats) voicing.forEach((midi, index) => {
      const picked = palette.chord === 'chord-pluck';
      add(palette.chord, start + offset + (picked ? index * 0.13 : index * 0.009), midi,
        palette.chord === 'chord-pad' ? 4.1 : picked ? 2 : palette.id === 'pocket' ? 0.45 : 1.4,
        palette.chord === 'chord-pad' ? 0.028 : 0.036, (index - 1.5) * 0.22);
    });
    const bassBeats = palette.id === 'pocket' ? [0, 1.5, 2.75, 3.5]
      : palette.id === 'afterhours' ? [0, 1.5, 2, 3.5]
        : palette.id === 'circuit' ? [0, 1.75, 3]
          : palette.id === 'drift' || palette.id === 'lantern' ? [0] : [0, 2.5];
    bassBeats.forEach((offset, index) => {
      const root = chord.root - 12 + (index % 3 === 2 ? 7 : 0);
      add(palette.bass, start + offset, root, Math.min(1.3, (bassBeats[index + 1] ?? 4) - offset) * 0.8, 0.13);
    });
    const drum = (voice: RhythmVoice, offsets: number[], gain: number, pan = 0) => offsets.forEach(offset => add(voice, start + offset, 48, 0.35, gain * (0.88 + random() * 0.2), pan));
    switch (palette.id) {
      case 'velvet': drum('kick', [0, 2.5], 0.105); drum('snare', [1, 3], 0.035, -0.12); drum('hat', [0.5, 1.5, 2.5, 3.5].map(value => value + palette.swing), 0.017, 0.35); break;
      case 'afterhours': drum('kick', [0, 1, 2, 3], 0.1); drum('hat', [0.5, 1.5, 2.5, 3.5], 0.027, 0.3); drum('snare', [1, 3], 0.03, -0.15); break;
      case 'circuit': drum('kick', [0, 1.75, 2.5], 0.095); drum('rim', [1, 3.25], 0.03, -0.3); drum('hat', [0.5, 1.5, 2.25, 3.5], 0.023, 0.35); break;
      case 'woodland': drum('shaker', [0.5, 1.5, 2.5, 3.5], 0.024, 0.45); drum('rim', [1, 3], 0.018, -0.35); break;
      case 'pocket': drum('kick', [0, 1.5, 2.75], 0.09); drum('snare', [1, 3], 0.037, -0.15); drum('hat', [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(value => value + (value % 1 ? palette.swing : 0)), 0.015, 0.35); break;
      case 'drift': drum('kick', [0], 0.035); break;
      case 'sunroom': drum('hand-low', [0, 2.5], 0.055, -0.3); drum('hand-high', [1.5, 3], 0.034, 0.35); drum('shaker', [0.5, 1.5, 2.5, 3.5], 0.02, 0.5); break;
      case 'lantern': drum('hand-low', [0, 3], 0.04, -0.2); drum('shaker', [2.5], 0.012, 0.4); break;
    }
  }
  return { seed, paletteId: palette.id, paletteName: palette.name, key: `${KEY_NAMES[tonic % 12]} ${mode === 'major' ? 'major' : mode === 'soul' ? 'mixolydian' : 'minor'}`, bpm, beatMs, targetNotes, targetTimesMs: beats.map(beat => beat * beatMs), durationMs: endBeat * beatMs + 220, events: events.sort((a, b) => a.beat - b.beat), leadVoice: palette.lead };
}
