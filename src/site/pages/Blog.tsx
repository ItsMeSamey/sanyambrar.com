import { CompactList } from '../components/Entries.tsx';
import { Section, SiteHeader } from '../components/SiteChrome.tsx';
import { posts } from '../data.ts';

export function Blog() {
  return <>
    <SiteHeader/>
    <main>
      <section class="lab-intro"><h1>Writing</h1><p>Technical notes from things I actually debugged or built.</p></section>
      <Section id="posts-title" title="Posts"><CompactList entries={posts}/></Section>
    </main>
  </>;
}
