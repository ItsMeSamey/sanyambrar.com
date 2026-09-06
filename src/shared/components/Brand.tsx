import { For } from 'solid-js';
import { SmartLink } from './NavLink.tsx';

export function HomeBrand(props:{class?:string;href?:string}) {
  return <SmartLink class={props.class ?? 'home-brand-link'} href={props.href ?? '/'} aria-label="Sanyam Brar · Home">
    <span class="home-brand-name">Sanyam Brar</span>
  </SmartLink>;
}

type SemanticRole = 'accent' | 'error' | 'warning' | 'slow' | 'fast' | 'effort';
export const WORDLE_WORDMARK_COLORS = ['fast', 'warning', 'error', 'fast', 'effort', 'warning'] as const satisfies readonly SemanticRole[];
export const WORDLE_BACK_COLORS = ['error', ...WORDLE_WORDMARK_COLORS] as const satisfies readonly SemanticRole[];

/** Render arbitrary text using Wordle-style cells. Callers may provide one color per cell. */
export function WordleMark(props:{text:string;colors:readonly SemanticRole[];class?:string;ariaLabel?:string}) {
  const text = () => props.text;
  const role = (index:number) => props.colors[index % props.colors.length] ?? 'accent';
  return <span class={`wordle-text-mark${props.class ? ` ${props.class}` : ''}`} aria-label={props.ariaLabel ?? text()}>
    <For each={text().split('')}>{(letter, index) => {
      const name = () => role(index());
      return <i style={{background: `var(--site-${name()}-fg)`, color: `var(--site-${name()}-on-fg)`}}>{letter}</i>;
    }}</For>
  </span>;
}

/** Keybr's game-card wordmark, shared with in-game back navigation. */
export function KeybrMark(props:{class?:string;ariaLabel?:string}) {
  return <span class={`keybr-mark${props.class ? ` ${props.class}` : ''}`} aria-label={props.ariaLabel ?? 'Keybr'}>
    <i class="keybr-hit">K</i><i class="keybr-hit">e</i><i class="keybr-miss">y</i><i class="keybr-hit">b</i><i class="keybr-miss-bg">r</i><b class="keybr-cursor" aria-hidden="true"/>
  </span>;
}
