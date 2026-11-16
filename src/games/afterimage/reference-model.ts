import type { GameId } from './types.ts';
import { referenceData, type ReferenceBin } from './reference-data.ts';

export type HistogramReference = {
  kind: 'histogram';
  bins: readonly ReferenceBin[];
  unit: string;
  source: string;
};
export type MeanReference = { kind: 'mean'; mean: number; source: string };

// The saved scope encodes the rules, input and board used for that result.
// The currently mounted board must not change a saved result's comparison.
export function referenceFor(id: GameId, scope: string): HistogramReference | MeanReference | null {
  if (id === 'cps' && ['cps-v1-mouse-10s', 'tps-v1-touch-10s'].includes(scope)) {
    return { kind: 'mean', mean: 6.66, source: 'https://cpstest.app/stats/' };
  }
  const compatible: Partial<Record<GameId, [string, keyof typeof referenceData, string]>> = {
    visual: ['visual-v3-standard', 'memory', 'levels'],
    sequence: ['sequence-v3-growing', 'sequence', 'levels'],
    'sequence-fresh': ['sequence-v3-growing', 'sequence', 'levels'],
    number: ['number-v2-hb', 'number-memory', 'digits'],
    typing: ['typing-v4-hardware-passage', 'typing', 'WPM'],
    aim: ['aim-v4-standard-mouse', 'aim', 'ms'],
    chimp: ['chimp-v2-standard-mouse', 'chimp', 'numbers'],
    reaction: ['reaction-v5-desktop', 'reactiontime', 'ms'],
  };
  const match = compatible[id];
  if (!match || scope !== match[0]) return null;
  return { kind: 'histogram', bins: referenceData[match[1]], unit: match[2], source: `https://humanbenchmark.com/tests/${match[1]}` };
}

export function summarizeBins(bins: readonly ReferenceBin[]) {
  const total = bins.reduce((sum, bin) => sum + bin.count, 0);
  if (!bins.length || total <= 0) return null;
  const mean = bins.reduce((sum, bin) => sum + bin.id * bin.count, 0) / total;
  let cumulative = 0;
  let median = bins[bins.length - 1].id;
  for (const bin of bins) {
    cumulative += bin.count;
    if (cumulative >= total / 2) { median = bin.id; break; }
  }
  return { total, mean, median, maxCount: Math.max(...bins.map(bin => bin.count)) };
}
