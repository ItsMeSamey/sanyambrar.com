import { type JSX } from '@solidjs/web';
import { SmartLink } from '../../shared/components/NavLink.tsx';
import { TopBar } from '../../shared/components/TopBar.tsx';
import { ArrowUpRight } from '../../shared/components/Icons.tsx';

const PERSONAL_GITHUB = 'https://github.com/ItsMeSamey';
const ORG_GITHUB = 'https://github.com/SmallThingz';
const SITE_SOURCE = 'https://github.com/ItsMeSamey/sanyambrar.com';

function ExternalLink(props:{href:string;children:JSX.Element;copyLabel?:string}) {
  return <a href={props.href} data-copy-label={props.copyLabel} target="_blank" rel="noopener noreferrer">{props.children}<ArrowUpRight aria-hidden="true"/></a>;
}

export function PortfolioTopBar(props:{current?:'home'|'work'|'writing';start?:JSX.Element;omitWork?:boolean}) {
  return <TopBar start={props.start} actions={<>
    {!props.omitWork && <SmartLink href="/work/" aria-current={props.current === 'work' ? 'page' : undefined}>Work</SmartLink>}
    <SmartLink href="/blog/" aria-current={props.current === 'writing' ? 'page' : undefined}>Writing</SmartLink>
  </>}/>;
}

export function PageHeading(props:{title:string;home?:boolean;workspace?:boolean;children?:JSX.Element}) {
  return <header class={`portfolio-heading${props.home ? ' portfolio-heading-home' : ''}${props.workspace ? ' portfolio-heading-workspace' : ''}`}>
    <h1>{props.home ? <><span>Sanyam</span>{' '}<span class="portfolio-surname">Brar</span></> : props.title}</h1>
    {props.children}
  </header>;
}

export function PortfolioSheet(props:{children:JSX.Element;home?:boolean}) {
  return <div class={`portfolio-sheet${props.home ? ' portfolio-sheet-home' : ''}`}>{props.children}</div>;
}

export function ProfileLinks() {
  return <nav class="profile-links" aria-label="Profile">
    <ExternalLink href={PERSONAL_GITHUB} copyLabel="Sanyam Brar on GitHub">GitHub</ExternalLink>
    <ExternalLink href={ORG_GITHUB} copyLabel="SmallThingz on GitHub">SmallThingz</ExternalLink>
    <ExternalLink href="/Sanyam_Brar_Resume.pdf" copyLabel="Sanyam Brar's resume">Resume</ExternalLink>
  </nav>;
}

export function PortfolioFooter() {
  return <footer class="portfolio-footer" data-samey-construction-line>
    <SmartLink href="/">Sanyam Brar</SmartLink>
    <ExternalLink href={SITE_SOURCE} copyLabel="Source for this site">Site source</ExternalLink>
  </footer>;
}

export function Section(props:{id:string;title:string;href?:string;children:JSX.Element;class?:string}) {
  return <section class={`portfolio-section${props.class ? ` ${props.class}` : ''}`} aria-labelledby={props.id} data-samey-construction-line>
    <div class="section-head" data-samey-construction-line>
      <h2 id={props.id}>{props.href ? <SmartLink class="section-head-link" href={props.href}>{props.title}<ArrowUpRight aria-hidden="true"/></SmartLink> : props.title}</h2>
    </div>
    <div class="section-body">{props.children}</div>
  </section>;
}
