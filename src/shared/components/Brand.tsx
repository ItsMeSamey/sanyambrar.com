import { SmartLink } from './NavLink.tsx';

export function HomeBrand(props:{class?:string;href?:string}) {
  return <SmartLink class={props.class ?? 'home-brand-link'} href={props.href ?? '/'} aria-label="Sanyam Brar · Home">
    <span class="home-brand-name">Sanyam Brar</span>
  </SmartLink>;
}

export function WordleMark(props:{class?:string}) {
  return <span class={props.class ?? 'game-title game-wordle'} aria-label="Wordle">
    {'WORDLE'.split('').map(letter => <i>{letter}</i>)}
  </span>;
}
