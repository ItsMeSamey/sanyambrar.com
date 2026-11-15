import { KeybrMark, WordleMark, WORDLE_WORDMARK_COLORS } from '../../shared/components/Brand.tsx';
import { ChainLiveMark } from '../../shared/components/ChainLogo.tsx';
import { ArrowUpRight } from '../../shared/components/Icons.tsx';
import type { Entry } from '../data.ts';
import { SmartLink } from '../../shared/components/NavLink.tsx';
import { createProjectPreview } from './ProjectPreview.tsx';

const external = (href:string) => /^https?:/.test(href);

function EntryTags(props:{entry:Entry}) {
  return <span class="entry-tags">{props.entry.tags?.map(tag => <span>{tag}</span>)}</span>;
}

export function CompactList(props:{entries:Entry[]}) {
  return <div class="compact-list">{props.entries.map(entry =>
    <SmartLink class="compact-row" href={entry.href} target={external(entry.href) ? '_blank' : undefined} rel={external(entry.href) ? 'noopener noreferrer' : undefined} data-copy-label={entry.title}>
      <span class="compact-copy"><span class="compact-name">{entry.title}</span><span class="compact-note">{entry.note}</span></span>
      <span class="compact-language">{entry.tags?.[0]}</span>
      <ArrowUpRight class="entry-arrow" aria-hidden="true"/>
    </SmartLink>
  )}</div>;
}

function GameTitle(props:{entry:Entry}) {
  if (props.entry.href === '/wordle') return <WordleMark text="WORDLE" colors={WORDLE_WORDMARK_COLORS} class="game-title game-wordle"/>;
  if (props.entry.href === '/keybr') return <KeybrMark class="game-title game-keybr"/>;
  if (props.entry.href === '/chain/') return <ChainLiveMark class="game-chain-live"/>;
  return <strong class="game-title game-afterimage">{props.entry.title}</strong>;
}

export function GameCards(props:{entries:Entry[]}) {
  return <div class="grid game-grid">{props.entries.map((entry, index) =>
    <SmartLink class={`card game-card-${index}`} href={entry.href} data-copy-label={entry.title}>
      <div class="card-top"><GameTitle entry={entry}/></div>
      <div class="game-card-bottom"><span class="card-copy">{entry.note}</span><ArrowUpRight class="entry-arrow" aria-hidden="true"/></div>
    </SmartLink>
  )}</div>;
}

export function ProjectCards(props:{entries:Entry[]}) {
  const preview = createProjectPreview();
  return <><div class="project-grid">{props.entries.map(entry =>
    <article class="project">
      <div class="project-card-copy">
        <div class="project-head"><h3 class="project-name"><SmartLink href={entry.href} documentPreload={entry.demo === true} data-copy-label={entry.title}>{entry.title}<ArrowUpRight class="entry-arrow" aria-hidden="true"/></SmartLink></h3></div>
        <p>{entry.note}</p>
        <div class="project-card-foot"><EntryTags entry={entry}/>{preview.button(entry)}</div>
      </div>
    </article>
  )}</div>{preview.panel}</>;
}

export function ProjectIndex(props:{entries:Entry[]}) {
  const preview = createProjectPreview();
  return <><div class="project-index" data-samey-construction-line>{props.entries.map(entry =>
    <article class="project-index-row" data-samey-construction-line>
      <div class="project-index-copy"><h2><SmartLink href={entry.href} documentPreload={entry.demo === true} data-copy-label={entry.title}>{entry.title}<ArrowUpRight class="entry-arrow" aria-hidden="true"/></SmartLink></h2><p>{entry.note}</p><EntryTags entry={entry}/></div>
      {preview.button(entry)}
    </article>
  )}</div>{preview.panel}</>;
}

const postDate = new Intl.DateTimeFormat('en-GB', { day:'numeric', month:'short', year:'numeric', timeZone:'UTC' });

export function WritingEntries(props:{entries:Entry[];expanded?:boolean}) {
  return <div class={`writing-list${props.expanded ? ' writing-list-expanded' : ''}`} data-samey-construction-line>{props.entries.map(entry =>
    <article class="writing-entry" data-samey-construction-line>
      <SmartLink class="writing-entry-link" href={entry.href} data-copy-label={entry.title}>
        <div class="writing-entry-meta">{entry.date && <time datetime={entry.date}>{postDate.format(new Date(entry.date))}</time>}<EntryTags entry={entry}/></div>
        <div class="writing-entry-copy">{props.expanded ? <h2>{entry.title}</h2> : <h3>{entry.title}</h3>}{props.expanded && entry.summary && <p>{entry.summary}</p>}</div>
        <ArrowUpRight class="entry-arrow" aria-hidden="true"/>
      </SmartLink>
    </article>
  )}</div>;
}
