import { Match, Suspense, Switch, createSignal, lazy, onCleanup, onMount } from 'solid-js';
import { details } from './data';

const loaders = {
  home: () => import('./pages/Home'),
  work: () => import('./pages/Work'),
  tools: () => import('./pages/Tools'),
  chain: () => import('./pages/Chain'),
  project: () => import('./pages/Project'),
  blog: () => import('./pages/Blog'),
} as const;

const Home = lazy(() => loaders.home().then(m => ({ default: m.Home })));
const Work = lazy(() => loaders.work().then(m => ({ default: m.Work })));
const Tools = lazy(() => loaders.tools().then(m => ({ default: m.ToolsPage })));
const Chain = lazy(() => loaders.chain().then(m => ({ default: m.ChainPage })));
const Project = lazy(() => loaders.project().then(m => ({ default: m.ProjectPage })));
const Blog = lazy(() => loaders.blog().then(m => ({ default: m.Blog })));

type RouteKind = keyof typeof loaders;
type Route = { key: string; kind: RouteKind; slug?: string };
const cleanPath = (path: string) => path.replace(/\.html$/, '').replace(/\/$/, '') || '/';

function routeFromUrl(url: URL): Route | null {
  const path = cleanPath(url.pathname);
  if (path === '/' || /\/index$/.test(path)) return { key: 'home', kind: 'home' };
  if (/\/work$/.test(path)) return { key: 'work', kind: 'work' };
  if (/\/tools$/.test(path)) return { key: 'tools', kind: 'tools' };
  if (/\/chain$/.test(path)) return { key: 'chain', kind: 'chain' };
  if (/\/blog(?:\/index)?$/.test(path)) return { key: 'blog', kind: 'blog' };
  const match = path.match(/\/projects\/([^/]+)$/);
  if (match && details[match[1]]) return { key: `project:${match[1]}`, kind: 'project', slug: match[1] };
  return null;
}

const isStandaloneApp = (url: URL) => /\/(?:wordle|keybr)(?:\.html)?\/?$/.test(url.pathname);
const sameDocumentHash = (url: URL) => cleanPath(url.pathname) === cleanPath(location.pathname) && url.search === location.search && !!url.hash;
const preload = (route: Route) => loaders[route.kind]();

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

async function animateRouteSwap(commit: () => void, homeward = false) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const oldRoute = document.querySelector<HTMLElement>('.site-route');
  if (reduced || !oldRoute?.animate) { commit(); return; }

  const out = oldRoute.animate(
    homeward
      ? [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.94)' }]
      : [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'translateY(-4px) scale(.982)' }],
    { duration: 130, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' },
  );
  try { await out.finished; } catch {}
  out.cancel();
  commit();
  await nextFrame();

  const newRoute = document.querySelector<HTMLElement>('.site-route');
  if (!newRoute?.animate) return;
  const enter = newRoute.animate(
    homeward
      ? [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'scale(1)' }]
      : [{ opacity: 0, transform: 'translateY(6px) scale(.975)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
    { duration: 210, easing: 'cubic-bezier(.22,1,.36,1)' },
  );
  try { await enter.finished; } catch {}
}

export function App() {
  const initial = routeFromUrl(new URL(location.href)) || { key: 'home', kind: 'home' as const };
  const [route, setRoute] = createSignal<Route>(initial);
  let navigationId = 0;

  const syncDocument = (next: Route) => {
    document.body.classList.toggle('site-tools-active', next.kind === 'tools');
    document.body.classList.toggle('site-chain-active', next.kind === 'chain');
    document.documentElement.dataset.siteKind = next.kind;
    document.documentElement.dataset.sitePage = next.kind;
    document.documentElement.dataset.homeHref = '/';
    if (next.kind === 'project') document.documentElement.dataset.backHref = '/work';
    else delete document.documentElement.dataset.backHref;
    document.title = next.kind === 'home' ? 'Sanyam Brar'
      : next.kind === 'work' ? 'Work · Sanyam Brar'
      : next.kind === 'tools' ? 'Tools · Sanyam Brar'
      : next.kind === 'chain' ? 'Chain Reaction'
      : next.kind === 'blog' ? 'Writing · Sanyam Brar'
      : `${details[next.slug!]?.title || 'Project'} · Sanyam Brar`;
  };

  const commitNavigation = (next: Route, url: URL, replace: boolean) => {
    dispatchEvent(new Event('samey-pageleave'));
    setRoute(next);
    syncDocument(next);
    if (replace) history.replaceState({}, '', url); else history.pushState({}, '', url);
    dispatchEvent(new CustomEvent('samey-solid-routechange', { detail: { url: url.href, route: next.kind } }));
    queueMicrotask(() => {
      if (url.hash) document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();
      else scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      dispatchEvent(new CustomEvent('samey-pageload', { detail: { url: url.href, solid: true } }));
    });
  };

  const finishNavigation = async (next: Route, url: URL, replace: boolean) => {
    document.documentElement.dataset.navDirection = next.kind === 'home' ? 'home' : 'forward';
    try {
      await animateRouteSwap(() => commitNavigation(next, url, replace), next.kind === 'home');
    } finally {
      delete document.documentElement.dataset.navDirection;
    }
  };

  const navigate = async (href: string, replace = false) => {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin || isStandaloneApp(url)) { location.href = url.href; return; }
    if (sameDocumentHash(url)) {
      if (replace) history.replaceState({}, '', url); else history.pushState({}, '', url);
      document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();
      return;
    }
    const next = routeFromUrl(url);
    if (!next) { location.href = url.href; return; }
    const id = ++navigationId;
    document.documentElement.dataset.solidLoading = '';
    try {
      await preload(next);
      if (id !== navigationId) return;
      await finishNavigation(next, url, replace);
    } catch (error) {
      if (id === navigationId) dispatchEvent(new CustomEvent('samey-loaderror', { detail: { url: url.href, error } }));
    } finally {
      if (id === navigationId) delete document.documentElement.dataset.solidLoading;
    }
  };

  onMount(() => {
    syncDocument(initial);
    (globalThis as typeof globalThis & { SameySolidNavigate?: typeof navigate; SameyNavigate?: (href: string, opts?: { replace?: boolean }) => Promise<void> }).SameySolidNavigate = navigate;
    (globalThis as typeof globalThis & { SameyNavigate?: (href: string, opts?: { replace?: boolean }) => Promise<void> }).SameyNavigate = (href, opts) => navigate(href, !!opts?.replace);

    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target || anchor.hasAttribute('download') || anchor.closest('.tool-tabs')) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin || isStandaloneApp(url)) return;
      const next = routeFromUrl(url);
      if (!next && !sameDocumentHash(url)) return;
      event.preventDefault();
      void navigate(url.href);
    };
    const prefetch = (event: Event) => {
      const target = event.target as Element | null;
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target) return;
      const url = new URL(anchor.href, location.href);
      const next = url.origin === location.origin ? routeFromUrl(url) : null;
      if (next) void preload(next);
    };
    const pop = () => {
      const next = routeFromUrl(new URL(location.href));
      if (!next) return;
      const id = ++navigationId;
      document.documentElement.dataset.solidLoading = '';
      void preload(next).then(async () => {
        if (id !== navigationId) return;
        document.documentElement.dataset.navDirection = next.kind === 'home' ? 'home' : 'forward';
        try {
          await animateRouteSwap(() => {
            dispatchEvent(new Event('samey-pageleave'));
            setRoute(next);
            syncDocument(next);
            queueMicrotask(() => dispatchEvent(new CustomEvent('samey-pageload', { detail: { url: location.href, solid: true } })));
          }, next.kind === 'home');
        } finally {
          delete document.documentElement.dataset.navDirection;
          if (id === navigationId) delete document.documentElement.dataset.solidLoading;
        }
      }).catch(error => {
        if (id === navigationId) {
          delete document.documentElement.dataset.solidLoading;
          dispatchEvent(new CustomEvent('samey-loaderror', { detail: { url: location.href, error } }));
        }
      });
    };

    document.addEventListener('click', click);
    document.addEventListener('pointerover', prefetch, { passive: true });
    document.addEventListener('focusin', prefetch);
    addEventListener('popstate', pop);
    onCleanup(() => {
      document.removeEventListener('click', click);
      document.removeEventListener('pointerover', prefetch);
      document.removeEventListener('focusin', prefetch);
      removeEventListener('popstate', pop);
      delete (globalThis as typeof globalThis & { SameySolidNavigate?: typeof navigate }).SameySolidNavigate;
    });
  });

  return <div id="solid-site-app">
    <Suspense fallback={<div class="site-route-loading" aria-live="polite">Loading…</div>}>
      <Switch>
        <Match when={route().kind === 'home'}><div class="site-route site-standard"><Home /></div></Match>
        <Match when={route().kind === 'work'}><div class="site-route site-standard"><Work /></div></Match>
        <Match when={route().kind === 'tools'}><div class="site-route tools-page"><Tools /></div></Match>
        <Match when={route().kind === 'chain'}><div class="site-route site-page-chain"><Chain /></div></Match>
        <Match when={route().kind === 'blog'}><div class="site-route site-standard"><Blog /></div></Match>
        <Match when={route().kind === 'project' && !!route().slug}>
          <div class="site-route site-standard"><Project detail={details[route().slug!]} /></div>
        </Match>
      </Switch>
    </Suspense>
  </div>;
}
