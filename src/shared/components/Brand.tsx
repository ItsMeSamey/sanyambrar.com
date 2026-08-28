import { For } from 'solid-js';
import { SmartLink } from './NavLink.tsx';

export function HomeBrand(props:{class?:string;href?:string}) {
  return <SmartLink class={props.class ?? 'home-brand-link'} href={props.href ?? '/'} aria-label="Sanyam Brar · Home">
    <span class="home-brand-name">Sanyam Brar</span>
  </SmartLink>;
}

export const WORDLE_WORDMARK_COLORS = ['var(--site-fast-color, #60d788)', 'var(--site-accent, #787c7e)', 'var(--site-muted, #787c7e)', 'var(--site-fast-color, #60d788)', 'var(--site-accent, #787c7e)', 'var(--site-fast-color, #60d788)'] as const;
export const WORDLE_BACK_COLORS = ['var(--site-error, #cf6469)', ...WORDLE_WORDMARK_COLORS] as const;

/** Render arbitrary text using Wordle-style cells. Callers may provide one color per cell. */
export function WordleMark(props:{text:string;colors:readonly string[];class?:string;ariaLabel?:string}) {
  const text = () => props.text;
  const color = (index:number) => props.colors[index % props.colors.length] ?? 'var(--site-muted, #787c7e)';
  return <span class={`wordle-text-mark${props.class ? ` ${props.class}` : ''}`} aria-label={props.ariaLabel ?? text()}>
    <For each={text().split('')}>{(letter, index) => <i style={{background: color(index())}}>{letter}</i>}</For>
  </span>;
}
