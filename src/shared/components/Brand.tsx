export function HomeBrand(props:{class?:string;href?:string}) {
  return <a class={props.class ?? 'home-brand-link'} href={props.href ?? '/'} aria-label='Sanyam Brar · Home'>
    <span class='home-brand-name'>Sanyam Brar</span>
    <svg class='home-brand-icon' viewBox='0 0 24 24' aria-hidden='true'><path d='M3.5 10.5 12 3.75l8.5 6.75'/><path d='M5.5 9.25V20h13V9.25'/><path d='M9.5 20v-6h5v6'/></svg>
  </a>;
}


export function HomeIconLink(props:{class?:string;href?:string}) {
  return <a class={props.class ?? 'home-icon-link'} href={props.href ?? '/'} aria-label='Sanyam Brar · Home' title='Home'>
    <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3.5 10.5 12 3.75l8.5 6.75'/><path d='M5.5 9.25V20h13V9.25'/><path d='M9.5 20v-6h5v6'/></svg>
  </a>
}
export function WordleMark(props:{class?:string}) {
  return <span class={props.class ?? 'game-title game-wordle'} aria-label='Wordle'>
    {'WORDLE'.split('').map(letter => <i>{letter}</i>)}
  </span>;
}

export function ChainMark(props:{class?:string}) {
  return <span class={props.class ?? 'game-title game-chain'} aria-label='Chain Reaction'>
    <span>CHAIN</span>
    <svg viewBox='0 0 58 22' aria-hidden='true'>
      <path class='chain-link' d='M6 11h12M40 11h12'/>
      <rect class='chain-cell chain-cell-a' x='2' y='7' width='8' height='8' rx='1'/>
      <rect class='chain-cell chain-cell-core' x='20' y='4' width='18' height='14' rx='2'/>
      <path class='chain-burst' d='M29 1v3M29 18v3M17 11h3M38 11h3'/>
      <rect class='chain-cell chain-cell-b' x='48' y='7' width='8' height='8' rx='1'/>
    </svg>
    <span>REACTION</span>
  </span>;
}
