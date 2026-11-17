export const RHYTHM_FIRST_TAP_MS = 5000;
export const RHYTHM_TAIL_MS = 300;

export type RhythmJudgment = {
  passed: boolean;
  offsets: number[];
  errors: number[];
  missing: number;
  extra: number;
  matched: number;
  total: number;
  meanErrorMs: number;
  toleranceMs: number;
};

export function rhythmTolerance(beatMs: number) {
  return Math.max(90, Math.min(150, beatMs * .18));
}

/** Absolute device latency cancels out: only spacing after the first tap is judged. */
export function judgeRhythm(targets: readonly number[], taps: readonly number[], beatMs: number): RhythmJudgment {
  const toleranceMs = rhythmTolerance(beatMs);
  const offsets = taps.map(tap => tap - (taps[0] ?? 0));
  const errors = offsets.slice(1, targets.length).map((tap, index) => tap - (targets[index + 1] - (targets[0] ?? 0)));
  const missing = Math.max(0, targets.length - taps.length);
  const extra = Math.max(0, taps.length - targets.length);
  const matched = errors.filter(error => Math.abs(error) <= toleranceMs).length;
  const total = Math.max(0, targets.length - 1) + extra;
  const valid = targets.length >= 2 && targets.every(Number.isFinite) && taps.every(Number.isFinite) && errors.every(Number.isFinite);
  return {
    passed: valid && missing === 0 && extra === 0 && matched === targets.length - 1,
    offsets, errors, missing, extra, matched, total,
    meanErrorMs: errors.length ? errors.reduce((sum, error) => sum + Math.abs(error), 0) / errors.length : 0,
    toleranceMs,
  };
}

export function rhythmResponseDeadline(targets: readonly number[], beatMs: number, firstTapAt: number) {
  return firstTapAt + Math.max(0, (targets.at(-1) ?? 0) - (targets[0] ?? 0)) + rhythmTolerance(beatMs) + RHYTHM_TAIL_MS;
}
