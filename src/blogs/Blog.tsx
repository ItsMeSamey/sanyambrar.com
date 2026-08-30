import { CompactList } from '../site/components/Entries.tsx';
import { Section } from '../site/components/SiteChrome.tsx';
import { TopBar } from '../shared/components/TopBar.tsx';
import { posts } from '../site/data.ts';

export function Blog() {
  return <>
    <TopBar/>
    <main data-text-cursor-zone>
      <section class="page-intro"><h1>Writing</h1><p>Stuff I debugged, built, or got curious enough to write down.</p></section>
      <Section id="posts-title" title="Posts"><CompactList entries={posts}/></Section>
    </main>
  </>;
}
