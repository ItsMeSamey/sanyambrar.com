import type { JSX } from 'solid-js';

const PERSONAL_GITHUB = 'https://github.com/ItsMeSamey';
const ORG_GITHUB = 'https://github.com/SmallThingz';
const SITE_SOURCE = 'https://github.com/ItsMeSamey/itsmesamey.github.io';

function ExternalLink(props:{href:string;children:JSX.Element;copyLabel?:string}) {
  return <a href={props.href} data-copy-label={props.copyLabel} target="_blank" rel="noopener noreferrer">{props.children}</a>;
}

export function SiteSourceLink() {
  return <ExternalLink href={SITE_SOURCE} copyLabel="Source for this site">{"Site's source ↗"}</ExternalLink>;
}

export function Intro() {
  return <section class="intro" aria-label="About">
    <div class="intro-meta"><span>Zig</span><span>C++</span><span>Go</span><span>Java</span></div>
    <div class="intro-links">
      <ExternalLink href={PERSONAL_GITHUB} copyLabel="Sanyam Brar on GitHub">GitHub ↗</ExternalLink>
      <ExternalLink href={ORG_GITHUB} copyLabel="SmallThingz on GitHub">SmallThingz ↗</ExternalLink>
      <SiteSourceLink/>
    </div>
  </section>;
}

export function Section(props:{id:string;title:string;children:JSX.Element}) {
  return <section aria-labelledby={props.id}><div class="section-head"><h1 id={props.id}>{props.title}</h1></div>{props.children}</section>;
}

export function SiteFooter() {
  return <footer class="site-contact-footer" aria-label="Contact">
    <span class="site-contact-label">Contact</span>
    <div class="site-contact-links">
      <ExternalLink href={PERSONAL_GITHUB} copyLabel="Sanyam Brar on GitHub">GitHub · @ItsMeSamey ↗</ExternalLink>
      <ExternalLink href={ORG_GITHUB} copyLabel="SmallThingz on GitHub">SmallThingz ↗</ExternalLink>
      <SiteSourceLink/>
    </div>
  </footer>;
}
