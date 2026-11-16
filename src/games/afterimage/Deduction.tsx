import { For } from 'solid-js';
import { ChallengeGame } from './Challenges.tsx';
import type { ChallengeDefinition } from './challenge-types.ts';
import type { GameProps } from './types.ts';
import { createDeductionQuestion, type DeductionQuestion } from './deduction-core.ts';
import './deduction.css';

export function DeductionPrompt(props: { question: DeductionQuestion }) {
  return <div class="ai-deduction">
    <div class="ai-deduction-tiles" aria-label={`Tiles: ${props.question.tiles.join(', ')}`}>
      <For each={props.question.tiles}>{tile => <span aria-hidden="true">{tile}</span>}</For>
    </div>
    <p class="ai-deduction-legend">Arrows mean before</p>
    <div class="ai-deduction-premises" role="list" aria-label="Given rules">
      <For each={props.question.premises}>{premise => <div class="ai-deduction-premise" role="listitem" aria-label={`${premise.before} comes before ${premise.after}`}>
        <span aria-hidden="true">{premise.reverse ? premise.after : premise.before}</span>
        <svg viewBox="0 0 48 24" aria-hidden="true"><path d="M5 12H41M33 4L41 12 33 20" transform={premise.reverse ? 'translate(48 0) scale(-1 1)' : undefined}/></svg>
        <span aria-hidden="true">{premise.reverse ? premise.before : premise.after}</span>
      </div>}</For>
    </div>
    <p class="ai-deduction-question">Which must be true?</p>
  </div>;
}

export const deductionDefinition: ChallengeDefinition<DeductionQuestion> = {
  id: 'deduction',
  instruction: 'Each arrow points from an earlier tile to a later one; they need not be adjacent. Choose the statement true in every order that follows all the arrows.',
  createQuestion: createDeductionQuestion,
  Prompt: DeductionPrompt,
};
export function DeductionGame(props: GameProps) {
  return <ChallengeGame {...props} definition={deductionDefinition}/>;
}
