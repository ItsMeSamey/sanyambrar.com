import type { GameId } from './types';

export function shuffledRange(length: number, random: () => number = Math.random): number[] {
  const values = Array.from({ length }, (_, index) => index);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [values[i], values[j]] = [values[j]!, values[i]!];
  }
  return values;
}

export function visualRound(level: number, random: () => number = Math.random) {
  const size = Math.floor(Math.sqrt(9 + level * 3));
  return { size, targets: shuffledRange(size * size, random).slice(0, level + 2) };
}

export function sequenceRules(id: GameId) {
  const reverse = id.startsWith('reverse');
  const fresh = id.endsWith('-fresh');
  const standard = id === 'sequence';
  return {
    reverse, fresh, standard,
    scope: standard ? 'sequence-v3-growing' : `${reverse ? 'reverse' : 'sequence'}-v2-${fresh ? 'fresh' : 'growing'}`,
    lead: standard ? 1000 : 350,
    spacing: standard ? 500 : 650,
    duration: standard ? 500 : 450,
    score: (level: number) => standard ? level : level - 1,
  };
}

export function nextSequence(id: GameId, previous: readonly number[], level: number, random: () => number = Math.random): number[] {
  const rules = sequenceRules(id);
  if (rules.fresh) return Array.from({ length: level }, () => Math.floor(random() * 9));
  const choices = Array.from({ length: 9 }, (_, index) => index)
    .filter(index => !rules.standard || index !== previous.at(-1));
  return [...previous, choices[Math.floor(random() * choices.length)]!];
}
