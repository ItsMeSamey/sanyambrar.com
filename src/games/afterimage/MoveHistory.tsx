import { For } from 'solid-js';
import './move-history.css';

export type TileMove = { round: number; choice: string; expected?: string; outcome: string };

export function MoveHistory(props: { moves: readonly TileMove[] }) {
  return <details class="ai-move-history" open>
    <summary>Full run history · {props.moves.length} {props.moves.length === 1 ? 'choice' : 'choices'}</summary>
    <ol tabindex="0" aria-label="Every accepted choice in this run"><For each={props.moves}>{move => <li>
      <span class="ai-move-round">Round {move.round}</span>
      <span>{move.choice}</span>
      <span class="ai-move-outcome">{move.outcome}{move.expected ? ` · expected ${move.expected}` : ''}</span>
    </li>}</For></ol>
  </details>;
}
