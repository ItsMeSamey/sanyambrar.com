import { describe, expect, test } from 'bun:test';
import { composeRhythm, RHYTHM_PALETTES } from '../src/games/afterimage/rhythm-composition';
import { renderPreparedRhythm, renderRhythmPCM } from '../src/games/afterimage/rhythm-synthesis';

function energy(samples: Float32Array) {
  return samples.reduce((sum, value) => sum + value * value, 0) / samples.length;
}

describe('Rhythm original music', () => {
  test('every palette retains deterministic, finite, bounded foreground rhythms across survival levels', () => {
    for (const palette of RHYTHM_PALETTES) for (const level of [1, 2, 3, 6, 12, 19, 40, 10000]) for (const seed of [0, 1, 20261117]) {
      const phrase = composeRhythm({ seed, palette: palette.id, level });
      expect(composeRhythm({ seed, palette: palette.id, level })).toEqual(phrase);
      expect(phrase.targetNotes.length).toBe(Math.min(12, 3 + Math.floor((Math.min(40, level) - 1) / 2)));
      expect(phrase.targetTimesMs[0]).toBe(0);
      expect(phrase.targetTimesMs.every((time, index, times) => Number.isFinite(time) && (index === 0 || time - times[index - 1] >= 249))).toBe(true);
      expect(phrase.targetTimesMs.at(-1)! + 200).toBeLessThan(phrase.durationMs);
      expect(phrase.durationMs).toBeLessThan(18000);
      expect(phrase.events.length).toBeLessThan(200);
      expect(phrase.events.filter(event => event.target).map(({ beat, midi, durationBeats }) => ({ beat, midi, durationBeats }))).toEqual(phrase.targetNotes);
      expect(phrase.events.every(event => Number.isFinite(event.gain) && event.gain > 0 && event.beat >= 0 && event.beat * phrase.beatMs < phrase.durationMs)).toBe(true);
    }
  });

  test('independent seed changes create keys, harmony, rhythm and melodic variation', () => {
    const phrases = Array.from({ length: 100 }, (_, seed) => composeRhythm({ seed, palette: 'velvet', level: 9 }));
    expect(new Set(phrases.map(phrase => phrase.key)).size).toBeGreaterThanOrEqual(7);
    expect(new Set(phrases.map(phrase => JSON.stringify(phrase.targetTimesMs))).size).toBeGreaterThan(85);
    expect(new Set(phrases.map(phrase => JSON.stringify(phrase.targetNotes.map(note => note.midi)))).size).toBeGreaterThan(50);
    expect(new Set(RHYTHM_PALETTES.map(palette => composeRhythm({ seed: 14, palette: palette.id }).leadVoice)).size).toBe(8);
    expect(new Set(RHYTHM_PALETTES.map(palette => palette.bpm)).size).toBe(8);
  });

  test('malformed scalar inputs cannot allocate runaway scores', () => {
    for (const level of [-100, 0, NaN, Infinity]) {
      const phrase = composeRhythm({ seed: NaN, level });
      expect(phrase.targetNotes.length).toBe(3);
      expect(phrase.durationMs).toBeLessThan(10000);
    }
  });

  test('all eight arrangements render audible stereo without clipping, DC or abrupt ends', () => {
    for (const palette of RHYTHM_PALETTES) {
      const composition = composeRhythm({ seed: 20261117, palette: palette.id, level: 7 });
      const pcm = renderRhythmPCM(composition, { sampleRate: 12000 });
      let peak = 0;
      let dc = 0;
      expect(pcm.left.every(Number.isFinite)).toBe(true);
      for (const sample of pcm.left) { peak = Math.max(peak, Math.abs(sample)); dc += sample; }
      expect(peak).toBeGreaterThan(0.15);
      expect(peak).toBeLessThan(0.94);
      expect(Math.abs(dc / pcm.left.length)).toBeLessThan(0.002);
      expect(pcm.left[0]).toBe(0);
      expect(pcm.left.at(-1)).toBeCloseTo(0, 8);
      expect(pcm.right.at(-1)).toBeCloseTo(0, 8);
      expect(energy(pcm.left)).toBeGreaterThan(0.001);
      expect(pcm.left.some((sample, index) => sample !== pcm.right[index])).toBe(true);
    }
  });

  test('foreground dominates every palette while accompaniment remains audible', () => {
    for (const palette of RHYTHM_PALETTES) {
      const composition = composeRhythm({ seed: 33, palette: palette.id, level: 7 });
      const target = renderRhythmPCM(composition, { sampleRate: 8000, stem: 'target' });
      const backing = renderRhythmPCM(composition, { sampleRate: 8000, stem: 'backing' });
      expect(energy(target.left)).toBeGreaterThan(energy(backing.left) * 4);
      expect(energy(backing.left)).toBeGreaterThan(0.00001);
      for (const time of composition.targetTimesMs) {
        const start = Math.round(time / 1000 * target.sampleRate);
        expect(energy(target.left.subarray(start, start + 500))).toBeGreaterThan(energy(backing.left.subarray(start, start + 500)) * 8);
      }
    }
  });

  test('tap buffers preserve matching foreground and contain no accompaniment or second onset', () => {
    const phrase = composeRhythm({ seed: 392, palette: 'woodland', level: 8 });
    const rendered = renderPreparedRhythm(phrase);
    expect(rendered.taps).toHaveLength(phrase.targetNotes.length);
    const again = renderPreparedRhythm(phrase);
    expect(again.phrase.left).toEqual(rendered.phrase.left);
    rendered.taps.forEach((pcm, index) => {
      expect(pcm.left).toEqual(pcm.right);
      expect(pcm.left.length / pcm.sampleRate).toBeCloseTo((phrase.targetNotes[index].durationBeats * phrase.beatMs + 100) / 1000, 3);
      expect(pcm.left.at(-1)).toBe(0);
      expect(energy(pcm.left.subarray(0, Math.round(pcm.sampleRate * 0.07)))).toBeGreaterThan(energy(pcm.left.subarray(-Math.round(pcm.sampleRate * 0.07))) * 5);
    });
  });
});
