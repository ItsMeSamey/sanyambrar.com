import { describe, expect, test } from 'bun:test';
import { composeRhythm, RHYTHM_PALETTES } from '../src/games/afterimage/rhythm-composition';
import { renderRhythmPCM } from '../src/games/afterimage/rhythm-synthesis';

const beforeCeiling = (sample: number) => 0.94 * Math.atanh(sample / 0.94);

describe('Rhythm backing gain continuity', () => {
  test('a sustained backing note cannot jump when the foreground starts', () => {
    const composition = composeRhythm({ seed: 28, palette: 'pocket', level: 7 });
    const mixed = renderRhythmPCM(composition);
    const backing = renderRhythmPCM(composition, { stem: 'backing' });
    const onset = Math.round(composition.targetTimesMs.at(-1)! / 1000 * mixed.sampleRate);
    // This onset previously halved an active bass in one sample (a 0.052 jump).
    for (const pcm of [mixed, backing]) for (const channel of [pcm.left, pcm.right]) {
      expect(Math.abs(channel[onset] - channel[onset - 1])).toBeLessThan(0.01);
    }
  });

  test('actual mixed gain changes smoothly within a short window around exact onsets', () => {
    const composition = composeRhythm({ seed: 28, palette: 'pocket', level: 7 });
    for (const sampleRate of [8000, 24000, 48000]) {
      const full = renderRhythmPCM(composition, { sampleRate });
      const target = renderRhythmPCM(composition, { sampleRate, stem: 'target' });
      const unducked = renderRhythmPCM({ ...composition, targetTimesMs: [] }, { sampleRate, stem: 'backing' });
      let comparisons = 0;
      let largestGainStep = 0;
      let minimumGain = 1;
      let maximumGain = 0;
      let outsideWindowError = 0;
      let foregroundWindowError = 0;
      for (const channel of ['left', 'right'] as const) {
        let previousGain: number | undefined;
        for (let frame = 1; frame < full[channel].length - sampleRate * 0.2; frame++) {
          const backing = beforeCeiling(unducked[channel][frame]);
          if (Math.abs(backing) < 0.005) { previousGain = undefined; continue; }
          // Undo the shared ceiling before comparing stems: summing limited stems is incorrect.
          const gain = (beforeCeiling(full[channel][frame]) - beforeCeiling(target[channel][frame])) / backing;
          minimumGain = Math.min(minimumGain, gain);
          maximumGain = Math.max(maximumGain, gain);
          if (previousGain !== undefined) largestGainStep = Math.max(largestGainStep, Math.abs(gain - previousGain));
          previousGain = gain;
          comparisons++;
          const time = frame / sampleRate * 1000;
          if (composition.targetTimesMs.every(onset => time < onset - 20 || time > onset + 160)) outsideWindowError = Math.max(outsideWindowError, Math.abs(gain - 1));
          if (composition.targetTimesMs.some(onset => time >= onset && time < onset + 30)) foregroundWindowError = Math.max(foregroundWindowError, Math.abs(gain - 0.5));
        }
      }
      expect(comparisons).toBeGreaterThan(sampleRate);
      expect(minimumGain).toBeGreaterThanOrEqual(0.49998);
      expect(maximumGain).toBeLessThanOrEqual(1.00002);
      expect(outsideWindowError).toBeLessThan(0.00005);
      expect(foregroundWindowError).toBeLessThan(0.00005);
      expect(largestGainStep).toBeLessThan(100 / sampleRate);
    }
  });

  test('ducking leaves all target samples and score timing untouched', () => {
    for (const palette of RHYTHM_PALETTES) {
      const composition = composeRhythm({ seed: 20261117, palette: palette.id, level: 40 });
      const original = structuredClone(composition);
      const target = renderRhythmPCM(composition, { sampleRate: 8000, stem: 'target' });
      const withoutDucking = renderRhythmPCM({ ...composition, targetTimesMs: [] }, { sampleRate: 8000, stem: 'target' });
      expect(target.left).toEqual(withoutDucking.left);
      expect(target.right).toEqual(withoutDucking.right);
      expect(composition).toEqual(original);
      expect(target.left[0]).toBe(0);
      expect(target.left.subarray(1, 80).some(sample => sample !== 0)).toBe(true);
      expect(target.left.at(-1)).toBe(0);
    }
  });
});
