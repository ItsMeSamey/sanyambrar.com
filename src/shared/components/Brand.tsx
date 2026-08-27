export function HomeBrand(props:{class?:string;href?:string;cue?:boolean}) {
  return <a class={props.class ?? 'home-brand-link'} href={props.href ?? '/'} aria-label='Sanyam Brar home page'>
    <span class='home-brand-name'>Sanyam Brar</span>
    {props.cue !== false && <small class='home-brand-cue'>HOME</small>}
  </a>;
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
