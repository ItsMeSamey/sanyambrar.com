import type { ChallengeQuestion } from './challenge-types.ts';

type Lab = readonly [number, number, number];
type Random = () => number;
type Colour = { css: string; lab: Lab };
export type ColourMatchQuestion = ChallengeQuestion & { target: string; swatches: readonly string[] };

const toLinear = (value: number) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
const toGamma = (value: number) => value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
const distance = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function rgbToLab(rgb: readonly number[]): Lab {
  const [r, g, b] = rgb.map(value => toLinear(value / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

function colour(lab: Lab): Colour | null {
  const [lightness, a, b] = lab;
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  // Reject out-of-gamut colours instead of clipping distinct candidates together.
  if (linear.some(channel => channel < 0 || channel > 1 || !Number.isFinite(channel))) return null;
  const rgb = linear.map(channel => Math.round(toGamma(channel) * 255));
  return { css: `#${rgb.map(channel => channel.toString(16).padStart(2, '0')).join('')}`, lab: rgbToLab(rgb) };
}

export function colourMatchDistance(round: number): number {
  const progress = Number.isFinite(round) ? Math.max(0, round) : 0;
  return 0.024 + 0.078 * Math.exp(-progress / 14);
}

function targetColour(random: Random): Colour {
  for (let attempt = 0; attempt < 48; attempt++) {
    const lightness = 0.38 + random() * 0.44, chroma = 0.025 + random() * 0.155, hue = random() * Math.PI * 2;
    const candidate = colour([lightness, chroma * Math.cos(hue), chroma * Math.sin(hue)]);
    if (candidate) return candidate;
  }
  return colour([0.62, 0.06, -0.03])!;
}

function distractors(target: Colour, radius: number, rotation: number): Colour[] {
  const options: Colour[] = [];
  // A bounded sphere search still works with a constant random source or a target near a gamut edge.
  for (let i = 0; i < 192 && options.length < 3; i++) {
    const j = i * 73 % 192, z = 1 - 2 * (j + 0.5) / 192;
    const angle = j * Math.PI * (3 - Math.sqrt(5)) + rotation, ring = Math.sqrt(1 - z * z);
    const candidate = colour([target.lab[0] + radius * z,
      target.lab[1] + radius * ring * Math.cos(angle), target.lab[2] + radius * ring * Math.sin(angle)]);
    if (!candidate || candidate.css === target.css) continue;
    const gap = distance(candidate.lab, target.lab);
    // Check the actual 8-bit colours that the browser paints, including quantisation.
    if (gap < radius * 0.86 || gap > radius * 1.14) continue;
    if (options.some(option => option.css === candidate.css || distance(option.lab, candidate.lab) < radius * 0.8)) continue;
    options.push(candidate);
  }
  return options;
}

export function createColourMatchQuestion(round: number, random: Random = Math.random): ColourMatchQuestion {
  const radius = colourMatchDistance(round), rotation = random() * Math.PI * 2;
  let target = targetColour(random), alternatives = distractors(target, radius, rotation);
  if (alternatives.length !== 3) {
    target = colour([0.62, 0, 0])!;
    alternatives = distractors(target, radius, rotation);
  }
  const swatches = [target.css, ...alternatives.map(option => option.css)];
  for (let i = swatches.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [swatches[i], swatches[j]] = [swatches[j], swatches[i]];
  }
  const correct = swatches.indexOf(target.css);
  return { target: target.css, swatches, options: swatches.map((_, index) => `Colour option ${index + 1}`), correct,
    explanation: `Option ${correct + 1} matches the target exactly.` };
}
