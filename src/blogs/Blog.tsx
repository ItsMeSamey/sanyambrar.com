import '../site/styles/home.css';
import { WritingEntries } from '../site/components/Entries.tsx';
import { PageHeading, PortfolioFooter, PortfolioTopBar } from '../site/components/SiteChrome.tsx';
import { posts } from '../site/data.ts';

export function Blog() {
  return <>
    <PortfolioTopBar current="writing"/>
    <main data-text-cursor-zone>
      <PageHeading title="Writing"/>
      <WritingEntries entries={posts} expanded/>
      <PortfolioFooter/>
    </main>
  </>;
}
