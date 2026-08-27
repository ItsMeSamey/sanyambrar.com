import type { JSX } from 'solid-js';
import { SITE_NAV } from '../../shared/catalog.ts';
import { AppearanceIcon } from './icons.tsx';

export function AppearanceButton(props:{class?:string}) {
  return <button class={props.class || 'top-icon'} type="button" data-samey-appearance aria-label="Appearance" aria-expanded="false"><AppearanceIcon/></button>;
}

export function SearchButton() {
  return <button class="search-trigger" type="button" data-open-search aria-label="Search"><kbd data-search-shortcut>Ctrl K</kbd></button>;
}

export function TopBar(props:{class?:string; brandClass?:string; brandHref?:string; brand?:JSX.Element; children?:JSX.Element}) {
  return <header class={`top${props.class ? ` ${props.class}` : ''}`}>
    {props.brand ?? <a class={props.brandClass || 'brand'} href={props.brandHref || '/'}>Sanyam Brar</a>}
    {props.children}
  </header>;
}

export function PrimaryNav(props:{active?:string; class?:string; search?:boolean}) {
  return <nav class={props.class || 'top-nav'} aria-label="Primary">
    {SITE_NAV.map(item => <a href={item.href} aria-current={item.label.toLowerCase() === props.active ? 'page' : undefined}>{item.label}</a>)}
    <AppearanceButton/>
    {props.search !== false && <SearchButton/>}
  </nav>;
}

export function SiteHeader(props:{active?:string}) {
  return <TopBar><PrimaryNav active={props.active}/></TopBar>;
}

export function Intro() {
  return <section class="intro" aria-label="About"><div class="intro-meta"><span>Zig</span><span>C++</span><span>Go</span><span>Java</span></div><div class="intro-links"><a href="https://github.com/ItsMeSamey" data-copy-label="Sanyam Brar on GitHub" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a href="https://github.com/SmallThingz" data-copy-label="SmallThingz on GitHub" target="_blank" rel="noopener noreferrer">SmallThingz ↗</a></div></section>;
}

export function Section(props:{id:string;title:string;children:JSX.Element}) {
  return <section aria-labelledby={props.id}><div class="section-head"><h1 id={props.id}>{props.title}</h1></div>{props.children}</section>;
}
