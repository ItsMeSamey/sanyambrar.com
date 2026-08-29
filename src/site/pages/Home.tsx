import ArrowUpRight from 'lucide-solid/icons/arrow-up-right';
import FileCode from 'lucide-solid/icons/file-code';
import { games, posts } from '../data.ts';
import { TOOLS } from '../../shared/catalog.ts';
import { GameCards } from '../components/Entries.tsx';
import { Intro, Section } from '../components/SiteChrome.tsx';
import { SmartLink } from '../../shared/components/NavLink.tsx';
import { TopBar } from '../../shared/components/TopBar.tsx';

const writingPreview = {
  kicker: 'C++ / CONCURRENCY / BTOP',
  date: '25 AUG 2026',
  summary: 'A debugging trail through btop that uncovered two synchronization bugs: a compare-exchange loop that could admit multiple owners, and relaxed atomic waits being treated as a thread hand-off.',
  points: [
    'A failed compare-exchange mutated expected, turning the next retry into a successful no-op.',
    'Observing an atomic flag change did not synchronize the ordinary writes around it.',
    'The fixes became part of btop PR #1649 without claiming to solve the original CPU-hotplug crash.',
  ],
};

function EditorialTools() {
  return <div class="home-tool-matrix">
    {TOOLS.map((tool, index) => <SmartLink class="home-tool" href={`/tools/?tool=${tool.id}`}>
      <span class="home-tool-index">{String(index + 1).padStart(2, '0')} / {tool.label.toUpperCase()}</span>
      <span class="home-tool-top"><strong>{tool.title}</strong><ArrowUpRight aria-hidden="true"/></span>
      <span class="home-tool-desc">{tool.note}</span>
    </SmartLink>)}
  </div>;
}

function WritingSplit() {
  const post = posts[0];
  if (!post) return null;
  return <div class="home-writing-split">
    <nav class="home-writing-index" aria-label="Writing index">
      {posts.map((entry, index) => <SmartLink class="home-writing-link" href={entry.href} aria-current={index === 0 ? 'page' : undefined}>
        <span class="home-writing-num">{String(index + 1).padStart(2, '0')}</span>
        <span><strong>{entry.title}</strong><small>{entry.note}</small></span>
        <span class="home-writing-chevron" aria-hidden="true">›</span>
      </SmartLink>)}
    </nav>
    <article class="home-writing-detail" data-text-cursor-zone>
      <div>
        <div class="home-writing-kicker">{writingPreview.kicker}</div>
        <time>{writingPreview.date}</time>
        <h2>{post.title}</h2>
        <p class="home-writing-dek">{post.note}</p>
        <p class="home-writing-summary">{writingPreview.summary}</p>
        <ul>{writingPreview.points.map(point => <li>{point}</li>)}</ul>
      </div>
      <footer><span>{post.tags?.map(tag => tag.toUpperCase()).join(' / ')}</span><SmartLink href={post.href}>READ ARTICLE <ArrowUpRight aria-hidden="true"/></SmartLink></footer>
    </article>
  </div>;
}

function HomeIntro() {
  return <div class="home-intro-wrap">
    <Intro/>
    <a
      class="home-source-link"
      href="https://github.com/ItsMeSamey/itsmesamey.github.io"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View this site's source code on GitHub"
      title="Source code"
    >
      <FileCode aria-hidden="true"/>
    </a>
  </div>;
}

export function Home(){return <><TopBar showWork/><main><HomeIntro/><Section id="games-title" title="Games"><GameCards entries={games}/></Section><Section id="tools-title" title="Tools"><EditorialTools/></Section><Section id="writing-title" title="Writing"><WritingSplit/></Section></main></>}
