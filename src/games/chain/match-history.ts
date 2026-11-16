type MatchSummary = { s: string; w: number; r: number; c: number };
type MatchHistory<T extends MatchSummary> = {
  base: { games: number; wins: number; largest: number };
  matches: T[];
};

export function compactMatchHistory<T extends MatchSummary, D extends MatchHistory<T>>(db: D, limit = 120): D {
  const base = {...db.base};
  const matches = db.matches.filter((match, index) => {
    // Only finished matches can be folded into the all-time counters.
    if (index < limit || match.s !== 'completed') return true;
    base.games++;
    if (match.w === 1) base.wins++;
    base.largest = Math.max(base.largest, match.r * match.c);
    return false;
  });
  return {...db, base, matches};
}

export function canResumeReplay(frame: { winner: number } | undefined, playing: boolean): boolean {
  return frame !== undefined && frame.winner === 0 && !playing;
}
