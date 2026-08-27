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
  return <button class="search-trigger site-topbar-search" type="button" data-open-search aria-label="Search">
    <Search class="site-topbar-search-icon" aria-hidden="true"/>
    <kbd data-search-shortcut>Ctrl K</kbd>
  </button>;
}

export function TopBar(props:{class?:string; brandClass?:string; brandHref?:string; brand?:JSX.Element; children?:JSX.Element}) {
  return <header class={`top site-topbar${props.class ? ` ${props.class}` : ''}`}>
    {props.brand ?? <HomeBrand class={props.brandClass ? `${props.brandClass} home-brand-link` : 'brand home-brand-link'} href={props.brandHref || '/'}/>} 
    {props.children}
  </header>;
}

export function PrimaryNav(props:{active?:string; class?:string; search?:boolean}) {
  return <nav class={`${props.class || 'top-nav'} site-topbar-nav`} aria-label="Primary">
    {SITE_NAV.map(item => <SmartLink href={item.href} aria-current={item.label.toLowerCase() === props.active ? 'page' : undefined}>{item.label}</SmartLink>)}
    <AppearanceButton/>
    {props.search !== false && <SearchButton/>}
  </nav>;
}

export function SiteHeader(props:{active?:string}) {
  return <TopBar><PrimaryNav active={props.active}/></TopBar>;
}
