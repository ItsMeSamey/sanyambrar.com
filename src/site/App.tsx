import { ErrorBoundary, Match, Show, Suspense, Switch, createSignal, lazy, onCleanup, onMount } from 'solid-js';
import { animateRootSwap } from '../shared/transitions.ts';
import { details } from './data';

const rawLoaders = {
  home: () => import('./pages/Home'),
  work: () => import('./pages/Work'),
  tools: () => import('./pages/Tools'),
  chain: () => import('./pages/Chain'),
  project: () => import('./pages/Project'),
  blog: () => import('./pages/Blog'),
} as const;

type RouteKind = keyof typeof rawLoaders;
const moduleCache = new Map<RouteKind, Promise<unknown>>();
const loadModule = <K extends RouteKind>(kind: K): ReturnType<(typeof rawLoaders)[K]> => {
  let task = moduleCache.get(kind);
  if (!task) {
    task = rawLoaders[kind]().catch(error => {
      moduleCache.delete(kind);
      throw error;
    });
    moduleCache.set(kind, task);
  }
  return task as ReturnType<(typeof rawLoaders)[K]>;
};

const Home = lazy(() => loadModule('home').then(m => ({ default: m.Home })));
const Work = lazy(() => loadModule('work').then(m => ({ default: m.Work })));
const Tools = lazy(() => loadModule('tools').then(m => ({ default: m.ToolsPage })));
const Chain = lazy(() => loadModule('chain').then(m => ({ default: m.ChainPage })));
const Project = lazy(() => loadModule('project').then(m => ({ default: m.ProjectPage })));
const Blog = lazy(() => loadModule('blog').then(m => ({ default: m.Blog })));

type Route = { key: string; kind: RouteKind; slug?: string };
type NavigationError = { url: string; message: string };
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
const preload = (route: Route) => loadModule(route.kind);
const setLoading = (value: boolean) => {
  const api = globalThis as typeof globalThis & { SameyLoading?: (loading: boolean) => void };
  if (api.SameyLoading) api.SameyLoading(value);
  else dispatchEvent(new CustomEvent('samey-loading', { detail: value }));
  document.documentElement.toggleAttribute('data-solid-loading', value);
};
const preloadUrl = (url: URL) => {
  if (url.origin !== location.origin) return;
  if (isStandaloneApp(url)) {
    (globalThis as typeof globalThis & { SameyPreloadPage?: (href: string) => void }).SameyPreloadPage?.(url.href);
    return;
  }
  const next = routeFromUrl(url);
  if (next) void preload(next);
};

async function animateRouteSwap(commit: () => void, homeward = false) {
  await animateRootSwap(
    document.querySelector<HTMLElement>('.site-route'),
    commit,
    () => document.querySelector<HTMLElement>('.site-route'),
    homeward ? 'back' : 'forward',
  );
}

function RouteLoading() {
  return <div class="site-route-loading" role="status" aria-live="polite"><span>Loading page</span></div>;
}

function RouteError(props: { error: NavigationError; onRetry: () => void; onDismiss: () => void }) {
  return <aside class="site-route-error" role="alert" aria-live="assertive">
    <div><strong>Page failed to load</strong><span>{props.error.message}</span></div>
    <div class="site-route-error-actions">
      <button type="button" onClick={props.onRetry}>Retry</button>
      <a href={props.error.url}>Open normally</a>
      <button type="button" class="quiet" onClick={props.onDismiss}>Dismiss</button>
    </div>
  </aside>;
}

export function App() {
  const initial = routeFromUrl(new URL(location.href)) || { key: 'home', kind: 'home' as const };
  const [route, setRoute] = createSignal<Route>(initial);
  const [navigationError, setNavigationError] = createSignal<NavigationError | null>(null);
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
    setNavigationError(null);
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
    const id = ++navigationId;
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) { location.assign(url.href); return; }
    setNavigationError(null);
    if (url.href === location.href) { setLoading(false); return; }
    if (isStandaloneApp(url)) {
      const pageSwap = (globalThis as typeof globalThis & { SameyPageSwapNavigate?: (href: string, opts?: { replace?: boolean }) => Promise<void> }).SameyPageSwapNavigate;
      setLoading(true);
      try {
        if (pageSwap) { await pageSwap(url.href, { replace }); return; }
        location.assign(url.href);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'The game could not be loaded.';
        setNavigationError({ url: url.href, message });
      } finally { if (id === navigationId) setLoading(false); }
      return;
    }
    if (sameDocumentHash(url)) {
      setLoading(false);
      if (replace) history.replaceState({}, '', url); else history.pushState({}, '', url);
      document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();
      return;
    }
    const next = routeFromUrl(url);
    if (!next) {
      const pageSwap = (globalThis as typeof globalThis & { SameyPageSwapNavigate?: (href: string, opts?: { replace?: boolean }) => Promise<void> }).SameyPageSwapNavigate;
      setLoading(true);
      try {
        if (pageSwap) await pageSwap(url.href, {replace});
        else location.assign(url.href);
      } catch (error) {
        if (id === navigationId) setNavigationError({url:url.href,message:error instanceof Error ? error.message : 'The page could not be loaded.'});
      } finally { if (id === navigationId) setLoading(false); }
      return;
    }
    setLoading(true);
    try {
      await preload(next);
      if (id !== navigationId) return;
      await finishNavigation(next, url, replace);
    } catch (error) {
      if (id === navigationId) {
        const message = error instanceof Error ? error.message : 'The page module could not be loaded.';
        setNavigationError({ url: url.href, message });
        dispatchEvent(new CustomEvent('samey-loaderror', { detail: { url: url.href, error } }));
      }
    } finally {
      if (id === navigationId) setLoading(false);
    }
  };

  const retryError = () => {
    const error = navigationError();
    if (!error) return;
    const url = new URL(error.url, location.href);
    const next = routeFromUrl(url);
    if (next) moduleCache.delete(next.kind);
    setNavigationError(null);
    void navigate(url.href);
  };

  onMount(() => {
    syncDocument(initial);
    const api = globalThis as typeof globalThis & {
      SameySolidNavigate?: typeof navigate;
      SameyNavigate?: (href: string, opts?: { replace?: boolean }) => Promise<void>;
      SameySolidPreload?: (href: string) => void;
    };
    api.SameySolidNavigate = navigate;
    api.SameyNavigate = (href, opts) => navigate(href, !!opts?.replace);
    api.SameySolidPreload = href => preloadUrl(new URL(href, location.href));

    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target || anchor.hasAttribute('download') || anchor.closest('.tool-tabs')) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin) return;
      if (sameDocumentHash(url)) return;
      event.preventDefault();
      void navigate(url.href);
    };
    const pop = () => {
      const id = ++navigationId;
      const url = new URL(location.href);
      const next = routeFromUrl(url);
      setNavigationError(null);
      if (!next) { setLoading(false); return; }
      if (next.key === route().key) {
        setLoading(false);
        syncDocument(next);
        dispatchEvent(new CustomEvent('samey-solid-routechange', { detail: { url: url.href, route: next.kind } }));
        queueMicrotask(() => dispatchEvent(new CustomEvent('samey-pageload', { detail: { url: url.href, solid: true } })));
        return;
      }
      setLoading(true);
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
          if (id === navigationId) setLoading(false);
        }
      }).catch(error => {
        if (id === navigationId) {
          setLoading(false);
          setNavigationError({ url: url.href, message: error instanceof Error ? error.message : 'The page could not be restored.' });
          dispatchEvent(new CustomEvent('samey-loaderror', { detail: { url: location.href, error } }));
        }
      });
    };

    document.addEventListener('click', click);
    addEventListener('popstate', pop);
    onCleanup(() => {
      document.removeEventListener('click', click);
      removeEventListener('popstate', pop);
      delete api.SameySolidNavigate;
      delete api.SameyNavigate;
      delete api.SameySolidPreload;
    });
  });

  return <div id="solid-site-app">
    <ErrorBoundary fallback={(error, reset) => <div class="site-fatal-error" role="alert">
      <strong>This view failed to render.</strong>
      <span>{error instanceof Error ? error.message : String(error)}</span>
      <div><button type="button" onClick={reset}>Retry view</button><a href={location.href}>Reload page</a></div>
    </div>}>
      <Suspense fallback={<RouteLoading/>}>
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
    </ErrorBoundary>
    <Show when={navigationError()}>{error => <RouteError error={error()} onRetry={retryError} onDismiss={() => setNavigationError(null)}/>}</Show>
  </div>;
}
