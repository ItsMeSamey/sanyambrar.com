import { Result } from './common.tsx';
import type { GameResult } from './types.ts';
import './board-result.css';

export function BoardResult(props: { result: GameResult; onRetry: () => void }) {
  return <div class="ai-board-result">
    <Result result={props.result} onRetry={props.onRetry} />
  </div>;
}
