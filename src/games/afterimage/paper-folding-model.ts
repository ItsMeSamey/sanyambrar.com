import type { ChallengeQuestion } from './challenge-types.ts';
import { shuffle, type Random } from './thinking-core.ts';

export type FoldDirection = 'left' | 'right' | 'up' | 'down';
export type PaperPoint = readonly [number, number];
export type PaperBounds = { left: number; top: number; right: number; bottom: number };
export type PaperFold = { direction: FoldDirection; before: PaperBounds; after: PaperBounds; crease: number };
export type PaperFoldingQuestion = ChallengeQuestion & {
  folds: readonly PaperFold[];
  punches: readonly PaperPoint[];
  patterns: readonly (readonly PaperPoint[])[];
};
export const paperSize = 64;
export const wholePaper: PaperBounds = { left: 0, top: 0, right: paperSize, bottom: paperSize };
const pick = (count: number, random: Random) => Math.floor(random() * count);

export function foldPaper(before: PaperBounds, direction: FoldDirection): PaperFold {
  const horizontal = direction === 'left' || direction === 'right';
  const crease = horizontal ? (before.left + before.right) / 2 : (before.top + before.bottom) / 2;
  const after = { ...before };
  if (direction === 'left') after.right = crease;
  if (direction === 'right') after.left = crease;
  if (direction === 'up') after.bottom = crease;
  if (direction === 'down') after.top = crease;
  return { direction, before: { ...before }, after, crease };
}

export function unfoldPaper(folds: readonly PaperFold[], punches: readonly PaperPoint[]): PaperPoint[] {
  let holes = [...punches];
  // Reverse the physical folds: every hole gains its reflection in the sheet being opened.
  for (let i = folds.length - 1; i >= 0; i--) {
    const { direction, crease } = folds[i];
    holes = holes.flatMap(([x, y]): PaperPoint[] => [
      [x, y], direction === 'left' || direction === 'right' ? [2 * crease - x, y] : [x, 2 * crease - y],
    ]);
  }
  return holes.sort(([ax, ay], [bx, by]) => ay - by || ax - bx);
}

export function paperPatternKey(points: readonly PaperPoint[]): string {
  return [...points].sort(([ax, ay], [bx, by]) => ay - by || ax - bx).map(point => point.join(',')).join(';');
}

export function describePaperPattern(points: readonly PaperPoint[]): string {
  return `${points.length} holes; positions from the top left: ${points.map(([x, y]) => `${x / paperSize * 100}% across, ${y / paperSize * 100}% down`).join('; ')}`;
}

export function createPaperFoldingQuestion(round: number, random: Random = Math.random): PaperFoldingQuestion {
  const count = round < 3 ? 1 : round < 8 ? 2 : 2 + pick(2, random);
  const firstHorizontal = pick(2, random) === 0;
  const folds: PaperFold[] = [];
  let bounds = wholePaper;
  for (let i = 0; i < count; i++) {
    // Alternate axes so even the third fold leaves a readable rectangle.
    const horizontal = i % 2 === 0 ? firstHorizontal : !firstHorizontal;
    const direction = (horizontal ? ['left', 'right'] : ['up', 'down'])[pick(2, random)] as FoldDirection;
    const fold = foldPaper(bounds, direction);
    folds.push(fold); bounds = fold.after;
  }
  const sites: PaperPoint[] = Array.from({ length: 9 }, (_, i) => [
    bounds.left + (1 + i % 3) * (bounds.right - bounds.left) / 4,
    bounds.top + (1 + Math.floor(i / 3)) * (bounds.bottom - bounds.top) / 4,
  ]);
  const twoPunches = round >= 12 && pick(3, random) === 0;
  const candidates: PaperPoint[][] = twoPunches
    ? sites.flatMap((site, i) => sites.slice(i + 1).map(other => [site, other]))
    : sites.map(site => [site]);
  const samples = shuffle(candidates, random).slice(0, 4);
  const punches = samples[0];
  const correctPattern = unfoldPaper(folds, punches);
  const patterns = shuffle(samples.map(sample => unfoldPaper(folds, sample)), random);
  const correct = patterns.findIndex(pattern => paperPatternKey(pattern) === paperPatternKey(correctPattern));
  return {
    folds, punches, patterns, correct,
    options: patterns.map(describePaperPattern),
    explanation: `Open the folds in reverse. Each punch makes ${2 ** count} holes, mirrored across every crease.`,
  };
}
