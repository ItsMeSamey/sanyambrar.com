import '../site/styles/home.css';
import { WritingEntries } from '../site/components/Entries.tsx';
import { PageHeading, PortfolioFooter, PortfolioSheet, PortfolioTopBar } from '../site/components/SiteChrome.tsx';
import { posts } from '../site/data.ts';

export function Blog() {
  return <>
    <PortfolioTopBar current="writing"/>
    <main class="portfolio-main" data-text-cursor-zone>
      <PortfolioSheet>
        <PageHeading title="Writing"/>
        <WritingEntries entries={posts} expanded/>
        <PortfolioFooter/>
      </PortfolioSheet>
    </main>
  </>;
}
