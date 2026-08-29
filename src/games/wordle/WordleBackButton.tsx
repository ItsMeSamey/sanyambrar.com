import type { JSX } from 'solid-js';
import { WordleMark, WORDLE_BACK_COLORS } from '../../shared/components/Brand.tsx';

export function WordleBackButton(props:{onClick:JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>}) {
  return <button type="button" role="link" onClick={props.onClick} class="backline wordle-wordle-back">
    <WordleMark text="<WORDLE" colors={WORDLE_BACK_COLORS} class="wordle-back-wordmark" ariaLabel="Back to Wordle"/>
  </button>;
}
