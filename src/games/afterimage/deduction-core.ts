import type { ChallengeQuestion } from './challenge-types.ts';
import { shuffle, type Random } from './thinking-core.ts';
import { selectPairObjects, type PairObject } from './pair-objects.ts';

type Edge = readonly [number, number];
export type DeductionMode = 'letters' | 'images';
export type DeductionPremise = { before: string; after: string; reverse: boolean };
export type DeductionClaim = { kind: 'before'; before: string; after: string } | { kind: 'position'; tile: string; position: number };
export type DeductionQuestion = ChallengeQuestion & {
  kind: 'relations' | 'positions';
  level: number;
  tiles: string[];
  premises: DeductionPremise[];
  claims: DeductionClaim[];
  objects: Record<string, PairObject>;
};

const layouts: readonly (readonly (readonly Edge[])[])[] = [
  [[[0, 1], [1, 2]]],
  [
    [[0, 1], [1, 2], [2, 3]],
    [[0, 1], [1, 2], [1, 3]],
    [[0, 2], [1, 2], [2, 3]],
  ],
  [
    [[0, 1], [1, 2], [2, 3], [3, 4]],
    [[0, 1], [1, 2], [1, 3], [3, 4]],
    [[0, 2], [1, 2], [2, 3], [3, 4]],
    [[0, 1], [0, 2], [1, 3], [2, 4]],
    [[0, 2], [1, 2], [2, 3], [2, 4]],
  ],
];
export const deductionOrdinal = (position: number) => ['1st', '2nd', '3rd', '4th', '5th'][position];
export function deductionClaimLabel(claim: DeductionClaim): string {
  return claim.kind === 'before' ? `${claim.before} before ${claim.after}` : `${claim.tile} is ${deductionOrdinal(claim.position)}`;
}

export function createDeductionQuestion(round: number, random: Random = Math.random, mode: DeductionMode = 'letters'): DeductionQuestion {
  const level = round < 1 ? 0 : round < 3 ? 1 : 2;
  const count = level + 3;
  const selectedObjects = mode === 'images' ? selectPairObjects(count, random) : [];
  const objects = Object.fromEntries(selectedObjects.map(object => [object.name, object]));
  const tiles = mode === 'images' ? selectedObjects.map(object => object.name) : Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
  const names = shuffle(tiles, random), family = layouts[level];
  const edges = family[Math.floor(random() * family.length)];
  const reach = Array.from({ length: count }, () => Array.from({ length: count }, () => false));
  for (const [a, b] of edges) reach[a][b] = true;
  for (let via = 0; via < count; via++) for (let a = 0; a < count; a++) for (let b = 0; b < count; b++) {
    reach[a][b] ||= reach[a][via] && reach[via][b];
  }
  const ancestors = (tile: number) => reach.filter(row => row[tile]).length;
  const descendants = (tile: number) => reach[tile].filter(Boolean).length;
  const kind = round >= 5 && round % 3 === 2 ? 'positions' : 'relations';
  type Candidate = { claim: DeductionClaim; entailed: boolean; possible: boolean; a: number; b: number };
  const candidates: Candidate[] = [];
  for (let a = 0; a < count; a++) for (let b = 0; b < count; b++) {
    if (kind === 'positions') {
      const earliest = ancestors(a), latest = count - 1 - descendants(a);
      candidates.push({ claim: { kind: 'position', tile: names[a], position: b }, entailed: earliest === b && latest === b, possible: earliest <= b && latest >= b, a, b });
    } else if (a !== b && !edges.some(([from, to]) => a === from && b === to)) {
      candidates.push({ claim: { kind: 'before', before: names[a], after: names[b] }, entailed: reach[a][b], possible: !reach[b][a], a, b });
    }
  }
  const answer = shuffle(candidates.filter(candidate => candidate.entailed), random)[0];
  const wrong = shuffle(candidates.filter(candidate => !candidate.entailed), random);
  // Include an undecided statement when available: possible does not mean necessary.
  const uncertain = wrong.find(candidate => candidate.possible);
  const distractors = uncertain ? [uncertain, ...wrong.filter(candidate => candidate !== uncertain).slice(0, 2)] : wrong.slice(0, 3);
  const choices = shuffle([answer, ...distractors], random);
  let explanation: string;
  if (kind === 'positions') {
    const before = ancestors(answer.a), after = descendants(answer.a);
    explanation = `${before} ${before === 1 ? 'tile' : 'tiles'} must come before ${names[answer.a]}; ${after} after.`;
  } else {
    function path(from: number, to: number): number[] {
      if (from === to) return [to];
      for (const [a, b] of edges) {
        if (a !== from || (b !== to && !reach[b][to])) continue;
        return [from, ...path(b, to)];
      }
      return [];
    }
    explanation = `${path(answer.a, answer.b).map(tile => names[tile]).join(' before ')}.`;
  }
  return {
    kind, level, tiles, objects,
    premises: shuffle(edges, random).map(([a, b]) => ({ before: names[a], after: names[b], reverse: round >= 2 && random() < .5 })),
    claims: choices.map(choice => choice.claim),
    options: choices.map(choice => deductionClaimLabel(choice.claim)),
    correct: choices.indexOf(answer), explanation,
  };
}
