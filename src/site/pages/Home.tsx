import '../styles/home.css';
import { ArrowUpRight } from '../../shared/components/Icons.tsx';
import { games, posts, projects } from '../data.ts';
import { TOOLS } from '../../shared/catalog.ts';
import { GameCards, ProjectCards, WritingEntries } from '../components/Entries.tsx';
import { PageHeading, PortfolioFooter, PortfolioSheet, PortfolioTopBar, ProfileLinks, Section } from '../components/SiteChrome.tsx';
import { SmartLink } from '../../shared/components/NavLink.tsx';

function EditorialTools() {
  return <div class="home-tool-matrix" data-samey-construction-line>
    {TOOLS.map(tool => <SmartLink class="home-tool" href={`/tools/?tool=${tool.id}`}>
      <strong>{tool.title}</strong>
      <span class="home-tool-desc">{tool.note}</span>
      <ArrowUpRight class="entry-arrow" aria-hidden="true"/>
    </SmartLink>)}
  </div>;
}

export function Home() {
  return <>
    <PortfolioTopBar current="home"/>
    <main class="portfolio-main">
      <PortfolioSheet home>
        <PageHeading title="Sanyam Brar" home><ProfileLinks/></PageHeading>
        <Section id="work-title" title="Work" href="/work/" class="home-work"><ProjectCards entries={projects.slice(0, 2)}/></Section>
        <Section id="games-title" title="Games" class="home-games"><GameCards entries={games}/></Section>
        <Section id="tools-title" title="Tools" href="/tools/" class="home-tools"><EditorialTools/></Section>
        <Section id="writing-title" title="Writing" href="/blog/" class="home-writing"><WritingEntries entries={posts}/></Section>
        <PortfolioFooter/>
      </PortfolioSheet>
    </main>
  </>;
}
