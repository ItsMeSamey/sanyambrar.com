import { createSignal } from 'solid-js';
import { Button } from '../../shared/components/Button.tsx';
import { Result } from './common.tsx';
import type { GameResult } from './types.ts';
import './board-result.css';

export function BoardResult(props: { result: GameResult; onRetry: () => void }) {
  const [review, setReview] = createSignal(false);
  return <div class="ai-board-result" data-review={review() ? 'true' : 'false'}>
    <Result overlay result={props.result} onRetry={props.onRetry} />
    <div class="ai-board-result-controls"><Button aria-pressed={review() ? 'true' : 'false'} onClick={() => setReview(!review())}>{review() ? 'Show result' : 'Review board'}</Button></div>
  </div>;
}
