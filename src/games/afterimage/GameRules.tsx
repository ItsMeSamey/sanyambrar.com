import { Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import './game-rules.css';

export function GameRules(props: { children: JSX.Element; detail?: string }) {
  return <div class="ai-game-rules"><p>{props.children}</p><Show when={props.detail}><p>{props.detail}</p></Show></div>;
}
