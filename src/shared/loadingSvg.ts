export const loadingGeometry = Object.freeze({
  size: 64,
  cx: 32,
  cy: 32,
  baseRadius: 8.4,
  amplitude: 1.35,
  waves: 6,
  duration: .72,
  zeroCrossingPower: .72,
  points: 96,
  frames: 25,
});

let framesCache: string[] | undefined;

export function generateLoadingFrames(): string[] {
  if (framesCache) return framesCache;
  const {cx, cy, baseRadius, amplitude, waves, zeroCrossingPower, points, frames} = loadingGeometry;
  framesCache = Array.from({length: frames}, (_, frame) => {
    const progress = frame / (frames - 1);
    const raw = Math.cos(progress * Math.PI * 2);
    const multiplier = Math.sign(raw) * Math.pow(Math.abs(raw), zeroCrossingPower);
    let d = '';
    for (let i = 0; i <= points; i++) {
      const angle = i / points * Math.PI * 2;
      const radius = baseRadius + amplitude * multiplier * Math.sin(waves * angle);
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      d += `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
    }
    return d + 'Z';
  });
  return framesCache;
}

export function generateAnimatedSineCircleSvg(): string {
  const paths = generateLoadingFrames();
  const keyTimes = paths.map((_, i) => (i / (paths.length - 1)).toFixed(6)).join(';');
  return `<svg class="samey-cursor-loading" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="${paths[0]}"><animate attributeName="d" dur="${loadingGeometry.duration}s" repeatCount="indefinite" calcMode="linear" keyTimes="${keyTimes}" values="${paths.join(';')}"/></path></svg>`;
}
