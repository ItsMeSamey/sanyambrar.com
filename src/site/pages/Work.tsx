import '../styles/home.css';
import { contributions, projects } from '../data.ts';
import { CompactList, ProjectIndex } from '../components/Entries.tsx';
import { PageHeading, PortfolioFooter, PortfolioSheet, PortfolioTopBar, ProfileLinks, Section } from '../components/SiteChrome.tsx';

export function Work() {
  return <>
    <PortfolioTopBar current="work"/>
    <main class="portfolio-main">
      <PortfolioSheet>
        <PageHeading title="Work"><ProfileLinks/></PageHeading>
        <ProjectIndex entries={projects}/>
        <Section id="contributions-title" title="Contributions"><CompactList entries={contributions}/></Section>
        <PortfolioFooter/>
      </PortfolioSheet>
    </main>
  </>;
}
