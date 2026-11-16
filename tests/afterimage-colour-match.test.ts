import { describe, expect, test } from 'bun:test';
import { colourMatchDistance, createColourMatchQuestion } from '../src/games/afterimage/colour-match-model.ts';
import { rgbToOklab0 } from '../src/games/keybr/color/convert-xyz.ts';

function seeded(seed: number) {
  return () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
}

// Use the existing independent XYZ conversion to check the colours actually sent to CSS.
function lab(hex: string) {
  const channels = [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const result = { l: 0, a: 0, b: 0, alpha: 1 };
  rgbToOklab0({ r: channels[0], g: channels[1], b: channels[2], alpha: 1 }, result);
  return result;
}
const distance = (a: ReturnType<typeof lab>, b: ReturnType<typeof lab>) => Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b);

describe('Colour Match', () => {
  test('renders exactly one exact match and three distinct in-gamut distractors at the intended perceptual distance', () => {
    const random = seeded(72019);
    for (let round = 0; round < 1600; round++) {
      const progress = round % 90, question = createColourMatchQuestion(progress, random), radius = colourMatchDistance(progress);
      expect(question.swatches).toHaveLength(4);
      expect(new Set(question.swatches).size).toBe(4);
      expect(question.correct).toBeGreaterThanOrEqual(0);
      expect(question.correct).toBeLessThan(4);
      expect(question.swatches[question.correct]).toBe(question.target);
      expect(question.swatches.filter(swatch => swatch === question.target)).toHaveLength(1);
      const target = lab(question.target);
      for (let i = 0; i < 4; i++) {
        expect(question.swatches[i]).toMatch(/^#[0-9a-f]{6}$/);
        const candidate = lab(question.swatches[i]);
        if (i === question.correct) continue;
        expect(distance(target, candidate)).toBeGreaterThanOrEqual(radius * 0.85);
        expect(distance(target, candidate)).toBeLessThanOrEqual(radius * 1.15);
        for (let j = 0; j < i; j++) expect(distance(candidate, lab(question.swatches[j]))).toBeGreaterThan(radius * 0.79);
      }
      expect(question.options).toEqual(['Colour option 1', 'Colour option 2', 'Colour option 3', 'Colour option 4']);
      expect(question.explanation).toContain(`Option ${question.correct + 1}`);
    }
  });

  test('covers the hue wheel, lightness, saturation, and all answer positions', () => {
    const random = seeded(27182), hues = new Set<number>(), positions = [0, 0, 0, 0];
    let lowLightness = 1, highLightness = 0, lowChroma = 1, highChroma = 0;
    for (let i = 0; i < 800; i++) {
      const question = createColourMatchQuestion(i % 40, random), target = lab(question.target);
      positions[question.correct]++;
      const hue = (Math.atan2(target.b, target.a) + Math.PI * 2) % (Math.PI * 2);
      hues.add(Math.floor(hue / (Math.PI * 2) * 12));
      lowLightness = Math.min(lowLightness, target.l); highLightness = Math.max(highLightness, target.l);
      const chroma = Math.hypot(target.a, target.b);
      lowChroma = Math.min(lowChroma, chroma); highChroma = Math.max(highChroma, chroma);
    }
    expect(hues.size).toBe(12);
    expect(lowLightness).toBeLessThan(0.41); expect(highLightness).toBeGreaterThan(0.79);
    expect(lowChroma).toBeLessThan(0.035); expect(highChroma).toBeGreaterThan(0.16);
    for (const count of positions) expect(count).toBeGreaterThan(140);
  });

  test('difficulty progresses smoothly and keeps a visible separation floor', () => {
    expect(colourMatchDistance(0)).toBeCloseTo(0.102);
    expect(colourMatchDistance(20)).toBeLessThan(0.045);
    expect(colourMatchDistance(60)).toBeLessThan(0.026);
    let previous = colourMatchDistance(0);
    for (let round = 1; round <= 500; round++) {
      const current = colourMatchDistance(round);
      expect(current).toBeLessThanOrEqual(previous);
      expect(current).toBeGreaterThanOrEqual(0.024);
      expect(previous - current).toBeLessThan(0.006);
      previous = current;
    }
    expect(colourMatchDistance(-1)).toBe(colourMatchDistance(0));
    expect(colourMatchDistance(Number.NaN)).toBe(colourMatchDistance(0));
    for (const random of [() => 0, () => 0.5, () => 0.999999]) {
      for (const round of [0, 20, 1000]) {
        const question = createColourMatchQuestion(round, random);
        expect(new Set(question.swatches).size).toBe(4);
        expect(question.swatches[question.correct]).toBe(question.target);
      }
    }
  });

  test('seeded sessions are reproducible', () => {
    const a = seeded(17), b = seeded(17);
    for (let round = 0; round < 40; round++) expect(createColourMatchQuestion(round, a)).toEqual(createColourMatchQuestion(round, b));
  });
});
