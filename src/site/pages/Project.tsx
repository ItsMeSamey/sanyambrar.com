import '../styles/home.css';
import { Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { ProjectDetail as ProjectDetailData } from '../data.ts';
import { SmartLink } from '../../shared/components/NavLink.tsx';
import { BackLink, TopBar } from '../../shared/components/TopBar.tsx';
import { FDroidIcon, GitIcon } from '../components/BrandIcons.tsx';

export function ProjectPage(props:{detail:ProjectDetailData;demo?:JSX.Element}) {
  const source = () => props.detail.links.find(link => link.title === 'Source') ?? props.detail.links[0];
  const fdroid = () => props.detail.links.find(link => link.title === 'F-Droid');
  return <>
    <TopBar start={<BackLink href="/work/">Work</BackLink>}/>
    <main class="detail">
      <article class="project-detail">
        <p class="eyebrow">Project</p>
        <h1>{props.detail.title}</h1>
        <div class="project-action-links">
          <Show when={source()}>{link =>
            <SmartLink class="project-action-link project-source-link" href={link().href} target="_blank" rel="noopener noreferrer" data-copy-label="Source">
              <GitIcon/>
              <span class="project-action-label">Source</span>
              <span class="project-action-arrow" aria-hidden="true">↗</span>
            </SmartLink>
          }</Show>
          <Show when={fdroid()}>{link =>
            <SmartLink class="project-action-link project-fdroid-link" href={link().href} target="_blank" rel="noopener noreferrer" data-copy-label="F-Droid">
              <FDroidIcon/>
              <span class="project-action-label">F-Droid</span>
              <span class="project-action-arrow" aria-hidden="true">↗</span>
            </SmartLink>
          }</Show>
        </div>
        <div class="fact-strip">{props.detail.facts.map(x => <span>{x}</span>)}</div>
        <section class="project-description"><p>{props.detail.body}</p></section>
        {props.demo}
      </article>
    </main>
  </>;
}
