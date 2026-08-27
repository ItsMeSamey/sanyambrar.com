import type { ProjectDetail as ProjectDetailData } from '../data.ts';
import { CompactList } from '../components/Entries.tsx';
import { SiteHeader } from '../components/SiteChrome.tsx';
export function ProjectPage(props:{detail:ProjectDetailData}){return <><SiteHeader active="work"/><main class="detail"><a class="backline" href="/work">‹ Work</a><article class="project-detail"><p class="eyebrow">Project</p><h1>{props.detail.title}</h1><p class="dek">{props.detail.dek}</p><div class="fact-strip">{props.detail.facts.map(x=><span>{x}</span>)}</div><section class="detail-copy"><h2>What it is</h2><p>{props.detail.body}</p></section><section class="detail-copy"><h2>Related</h2><CompactList entries={props.detail.links}/></section></article></main></>}
