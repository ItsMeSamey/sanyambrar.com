import '../styles/home.css';
import { ArrowUpRight, ChevronRight } from '../../shared/components/Icons.tsx';
import { games, posts, projects } from '../data.ts';
import { TOOLS } from '../../shared/catalog.ts';
import { GameCards, ProjectCards } from '../components/Entries.tsx';
import { Intro, Section } from '../components/SiteChrome.tsx';
import { SmartLink } from '../../shared/components/NavLink.tsx';
import { TopBar } from '../../shared/components/TopBar.tsx';

const writingPreview = {
  date: '25 AUG 2026',
  summary: 'Following a btop crash led me to a lock that could let two threads in at once. From there I traced another race through Runner::active.',
  points: [
    'A failed compare-exchange changed expected, allowing the next attempt to pass while another thread held the lock.',
    'Callers relied on Runner::active to hand off shared state. The waits needed acquire ordering.',
    'PR #1649 landed the race fixes. The original CPU-hotplug crash remains open.',
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
  const kicker = post.tags?.map(tag => tag.toUpperCase()).join(' / ');
  return <div class="home-writing-split">
    <nav class="home-writing-index" aria-label="Writing index">
      {posts.map((entry, index) => <SmartLink class="home-writing-link" href={entry.href} aria-current={index === 0 ? 'page' : undefined}>
        <span class="home-writing-num">{String(index + 1).padStart(2, '0')}</span>
        <span><strong>{entry.title}</strong><small>{entry.note}</small></span>
        <ChevronRight class="home-writing-chevron" size={18} aria-hidden="true"/>
      </SmartLink>)}
    </nav>
    <article class="home-writing-detail" data-text-cursor-zone>
      <div>
        {kicker && <div class="home-writing-kicker">{kicker}</div>}
        <time>{writingPreview.date}</time>
        <div class="home-writing-heading">
          <div>
            <h2>{post.title}</h2>
            <p class="home-writing-dek">{post.note}</p>
          </div>
          <SmartLink class="home-writing-read" href={post.href}>READ ARTICLE <ArrowUpRight aria-hidden="true"/></SmartLink>
        </div>
        <p class="home-writing-summary">{writingPreview.summary}</p>
        <ul>{writingPreview.points.map(point => <li>{point}</li>)}</ul>
      </div>
    </article>
  </div>;
}

export function Home(){return <><TopBar/><main><Intro/><Section id="games-title" title="Games"><GameCards entries={games}/></Section><Section id="work-title" title="Projects and demos" href="/work/"><ProjectCards entries={projects}/></Section><Section id="tools-title" title="Tools"><EditorialTools/></Section><Section id="writing-title" title="Writing" href="/blog/"><WritingSplit/></Section></main></>}
