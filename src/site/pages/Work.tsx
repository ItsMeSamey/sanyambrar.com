import '../styles/home.css';
import { contributions, projects } from '../data.ts';
import { CompactList, ProjectIndex } from '../components/Entries.tsx';
import { PageHeading, PortfolioFooter, PortfolioTopBar, ProfileLinks, Section } from '../components/SiteChrome.tsx';

export function Work() {
  return <>
    <PortfolioTopBar current="work"/>
    <main>
      <PageHeading title="Work"><ProfileLinks/></PageHeading>
      <ProjectIndex entries={projects}/>
      <Section id="contributions-title" title="Contributions" count={contributions.length}><CompactList entries={contributions}/></Section>
      <PortfolioFooter/>
    </main>
  </>;
}
