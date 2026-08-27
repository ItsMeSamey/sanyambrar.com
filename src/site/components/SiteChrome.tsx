import type { JSX } from 'solid-js';
export { AppearanceButton, PrimaryNav, SearchButton, SiteHeader, TopBar } from '../../shared/components/TopBar.tsx';

export function Intro() {
  return <section class="intro" aria-label="About"><div class="intro-meta"><span>Zig</span><span>C++</span><span>Go</span><span>Java</span></div><div class="intro-links"><a href="https://github.com/ItsMeSamey" data-copy-label="Sanyam Brar on GitHub" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a href="https://github.com/SmallThingz" data-copy-label="SmallThingz on GitHub" target="_blank" rel="noopener noreferrer">SmallThingz ↗</a></div></section>;
}

export function Section(props:{id:string;title:string;children:JSX.Element}) {
  return <section aria-labelledby={props.id}><div class="section-head"><h1 id={props.id}>{props.title}</h1></div>{props.children}</section>;
}
