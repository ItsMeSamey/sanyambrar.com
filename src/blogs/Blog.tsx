import { For, createMemo, createSignal } from 'solid-js';
import ArrowUpRight from 'lucide-solid/icons/arrow-up-right';
import ChevronRight from 'lucide-solid/icons/chevron-right';
import { TopBar } from '../shared/components/TopBar.tsx';
import { posts } from '../site/data.ts';

type BlogPreview = {
  title:string;
  kicker:string;
  dek:string;
  date:string;
  summary:string;
  points:string[];
};

const PREVIEWS:Record<string,BlogPreview> = {
  "btop's broken lock": {
    title: "btop's broken lock",
    kicker: 'C++ / CONCURRENCY / BTOP',
    dek: "the mutex that wasn't",
    date: '25 AUG 2026',
    summary: 'A debugging trail through btop that uncovered two separate synchronization bugs: a compare-exchange loop that could admit multiple owners, and relaxed atomic waits being treated as a thread hand-off.',
    points: [
      'Why a failed compare-exchange mutating expected turned the next retry into a successful no-op.',
      'Why seeing an atomic flag change is not the same thing as synchronizing the ordinary writes around it.',
      'How those fixes became part of btop PR #1649 without claiming to solve the original CPU-hotplug crash.',
    ],
  },
};

export function Blog() {
  const [selected, setSelected] = createSignal(0);
  const post = createMemo(() => posts[selected()] ?? posts[0]);
  const preview = createMemo(() => PREVIEWS[post()?.title] ?? {
    title: post()?.title ?? 'Writing',
    kicker: post()?.tags?.join(' / ').toUpperCase() ?? 'WRITING',
    dek: post()?.note ?? '',
    date: 'WRITING',
    summary: post()?.note ?? '',
    points: [],
  });

  return <>
    <TopBar/>
    <main class="blog-index-page">
      <header class="blog-index-intro">
        <div><span class="blog-index-eyebrow">WRITING / NOTES / DEBUGGING</span><h1>Writing</h1></div>
        <p>Technical notes from things I actually debugged or built.</p>
      </header>

      <section class="blog-split-index" aria-labelledby="blog-index-title">
        <h2 id="blog-index-title" class="sr-only">Writing index</h2>
        <nav class="blog-index-nav" aria-label="Writing index">
          <For each={posts}>{(entry, index) => <button
            type="button"
            class="blog-index-link"
            classList={{ active: selected() === index() }}
            aria-current={selected() === index() ? 'page' : undefined}
            onClick={() => setSelected(index())}
          >
            <span class="blog-index-num">{String(index() + 1).padStart(2, '0')}</span>
            <span class="blog-index-name"><strong>{entry.title}</strong><small>{entry.note}</small></span>
            <ChevronRight class="blog-index-chevron" aria-hidden="true"/>
          </button>}</For>
        </nav>

        <article class="blog-index-detail">
          <div>
            <div class="blog-detail-kicker">{preview().kicker}</div>
            <div class="blog-detail-date">{preview().date}</div>
            <h2>{preview().title}</h2>
            <p class="blog-detail-dek">{preview().dek}</p>
            <p class="blog-detail-summary">{preview().summary}</p>
            <ul class="blog-detail-points">
              <For each={preview().points}>{point => <li>{point}</li>}</For>
            </ul>
          </div>
          <footer class="blog-detail-footer">
            <span>{post()?.tags?.map(tag => tag.toUpperCase()).join(' / ')}</span>
            <a href={post()?.href}>READ ARTICLE <ArrowUpRight aria-hidden="true"/></a>
          </footer>
        </article>
      </section>
    </main>
  </>;
}
