import type { JSX } from 'solid-js';
import MoonStar from 'lucide-solid/icons/moon-star';
import Search from 'lucide-solid/icons/search';
import { SITE_NAV } from '../catalog.ts';
import { HomeBrand } from './Brand.tsx';
import { SmartLink } from './NavLink.tsx';

export function AppearanceButton(props:{class?:string;label?:string}) {
  return <button class={`${props.class || 'top-icon'} site-topbar-icon`} type="button" data-samey-appearance aria-label="Appearance" aria-expanded="false">
    <MoonStar aria-hidden="true"/>{props.label && <span class="site-topbar-icon-label">{props.label}</span>}
  </button>;
}

export function SearchButton() {
  return <button class="site-topbar-search" type="button" data-open-search aria-label="Search">
    <Search class="site-topbar-search-icon" aria-hidden="true"/>
    <kbd data-search-shortcut>Ctrl K</kbd>
  </button>;
}

export function PrimaryNav(props:{showWork?:boolean;activeHref?:string}) {
  return <nav class="top-nav site-topbar-nav" aria-label="Primary">
    {props.showWork && SITE_NAV.map(item => <SmartLink href={item.href} aria-current={props.activeHref === item.href ? 'page' : undefined}>{item.label}</SmartLink>)}
    <AppearanceButton/>
    <SearchButton/>
  </nav>;
}

/**
 * The only site top bar implementation.
 * Pages customize content through slots, never by creating another header/bar.
 */
export function TopBar(props:{start?:JSX.Element;context?:JSX.Element;contextClass?:string;showWork?:boolean;activeHref?:string;nav?:JSX.Element|false}) {
  return <header class="site-topbar">
    <div class="site-topbar-inner site-topbar-inner-contained">
      <div class="site-topbar-start">{props.start ?? <HomeBrand class="brand home-brand-link"/>}</div>
      <div class={`site-topbar-context${props.contextClass ? ` ${props.contextClass}` : ''}`}>{props.context}</div>
      {props.nav === false ? null : (props.nav ?? <PrimaryNav showWork={props.showWork} activeHref={props.activeHref}/>)}
    </div>
  </header>;
}

export function BackLink(props:{id?:string;href?:string;onClick?:JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;class?:string;children:JSX.Element}) {
  const className = `backline${props.class ? ` ${props.class}` : ''}`;
  const content = <><span class="backline-mark" aria-hidden="true">{'<'}</span><span>{props.children}</span></>;
  return props.href
    ? <SmartLink id={props.id} class={className} href={props.href}>{content}</SmartLink>
    : <button id={props.id} class={className} type="button" role="link" onClick={props.onClick}>{content}</button>;
}
