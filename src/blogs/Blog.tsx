import { CompactList } from '../site/components/Entries.tsx';
import { Section, SiteFooter } from '../site/components/SiteChrome.tsx';
import { TopBar } from '../shared/components/TopBar.tsx';
import { posts } from '../site/data.ts';

export function Blog() {
  return <>
    <TopBar/>
    <main data-text-cursor-zone>
      <section class="page-intro"><h1>Writing</h1><p>Technical notes from things I actually debugged or built.</p></section>
      <Section id="posts-title" title="Posts"><CompactList entries={posts}/></Section>
    </main>
    <SiteFooter/>
  </>;
}
