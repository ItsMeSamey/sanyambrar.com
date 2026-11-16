import type { JSX } from '@solidjs/web';

export type ChallengeId = 'paper-folding' | 'deduction' | 'colour-match';

export type ChallengeQuestion = {
  options: readonly string[];
  correct: number;
  explanation: string;
};

export type ChallengeDefinition<Q extends ChallengeQuestion> = {
  id: ChallengeId;
  scope?: string;
  rulesVersion?: number;
  instruction: string;
  createQuestion: (round: number, random?: () => number) => Q;
  Prompt: (props: { question: Q }) => JSX.Element;
  Option?: (props: { question: Q; index: number }) => JSX.Element;
};
