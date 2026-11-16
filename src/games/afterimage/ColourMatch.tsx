import { ChallengeGame } from './Challenges.tsx';
import type { ChallengeDefinition } from './challenge-types.ts';
import { createColourMatchQuestion, type ColourMatchQuestion } from './colour-match-model.ts';
import type { GameProps } from './types.ts';
import './colour-match.css';

function Prompt(props: { question: ColourMatchQuestion }) {
  return <figure class="ai-colour-target">
    <span class="ai-colour-swatch" role="img" aria-label="Target colour" style={{ 'background-color': props.question.target }}/>
    <figcaption>Target</figcaption>
  </figure>;
}

function Option(props: { question: ColourMatchQuestion; index: number }) {
  return <span class="ai-colour-swatch" aria-hidden="true" style={{ 'background-color': props.question.swatches[props.index] }}/>;
}

export const colourMatchDefinition: ChallengeDefinition<ColourMatchQuestion> = {
  id: 'colour-match',
  instruction: 'Choose the swatch with exactly the same colour as the target. This game relies on colour vision.',
  createQuestion: createColourMatchQuestion,
  Prompt,
  Option,
};

export default function ColourMatch(props: GameProps) {
  return <ChallengeGame {...props} definition={colourMatchDefinition}/>;
}
