import { ErrorBoundary, Match, Show, Suspense, Switch, createSignal, lazy, onCleanup, onMount } from 'solid-js';
import { TopBar } from '../shared/components/TopBar.tsx';
import { animateRootSwap } from '../shared/transitions.ts';
import { resilientImport } from '../shared/resilientImport.ts';
import { details } from './data';

const rawLoaders = {
  home: () => resilientImport(() => import('./pages/Home')),
  work: () => resilientImport(() => import('./pages/Work')),
  tools: () => resilientImport(() => import('../tools/Tools')),
  chain: () => resilientImport(() => import('../games/chain/Chain')),
  project: () => resilientImport(() => import('./pages/Project')),
  blog: () => resilientImport(() => import('../blogs/Blog')),
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
type NavigationDirection = 'forward' | 'back';
type NavigationError = { url: string; message: string; detail: string };
const cleanPath = (path: string) => path.replace(/\.html$/, '').replace(/\/index$/, '').replace(/\/$/, '') || '/';
const NAV_INDEX_KEY = '__sameyNavIndex';
const readNavigationIndex = () => {
  const value = history.state?.[NAV_INDEX_KEY];
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
};
const navigationState = (index: number) => ({
  ...(history.state && typeof history.state === 'object' ? history.state : {}),
  [NAV_INDEX_KEY]: index,
});

function routeFromUrl(url: URL): Route | null {
  const path = cleanPath(url.pathname);
  if (/\/blog(?:\/index)?$/.test(path)) return { key: 'blog', kind: 'blog' };
  if (path === '/') return { key: 'home', kind: 'home' };
  if (/\/work$/.test(path)) return { key: 'work', kind: 'work' };
  if (/\/tools$/.test(path)) return { key: 'tools', kind: 'tools' };
  if (/\/chain$/.test(path)) return { key: 'chain', kind: 'chain' };
  const match = path.match(/\/projects\/([^/]+)$/);
  if (match && details[match[1]]) return { key: `project:${match[1]}`, kind: 'project', slug: match[1] };
  return null;
}

const isStandaloneApp = (url: URL) => /\/(?:wordle|keybr)(?:\.html)?\/?$/.test(url.pathname);
const sameDocumentHash = (url: URL) => cleanPath(url.pathname) === cleanPath(location.pathname) && url.search === location.search && !!url.hash;
const hashTarget = (url: URL) => {
  if (!url.hash) return '';
  try { return decodeURIComponent(url.hash.slice(1)); } catch { return url.hash.slice(1); }
};
const preload = (route: Route) => loadModule(route.kind);
const setLoading = (value: boolean) => {
  if (globalThis.SameyLoading) globalThis.SameyLoading(value);
  else dispatchEvent(new CustomEvent('samey-loading', { detail: value }));
  document.documentElement.toggleAttribute('data-solid-loading', value);
};
const cancelSharedPageSwap = () => globalThis.SameyCancelPageSwap?.();
const pageSwapNavigate = () => globalThis.SameyPageSwapNavigate;
const preloadUrl = (url: URL) => {
  if (url.origin !== location.origin) return;
  if (isStandaloneApp(url)) {
    globalThis.SameyPreloadPage?.(url.href);
    return;
  }
  const next = routeFromUrl(url);
  if (next) void preload(next);
};

async function animateRouteSwap(commit: () => void, direction: NavigationDirection = 'forward') {
  await animateRootSwap(
    document.querySelector<HTMLElement>('.site-route'),
    commit,
    () => document.querySelector<HTMLElement>('.site-route'),
    direction,
  );
}

function RouteLoading() {
  let releaseLoading = () => {};
  onMount(() => {
    releaseLoading = globalThis.SameyLoadingBegin?.() ?? (() => {});
  });
  onCleanup(() => releaseLoading());
  return <div class="site-route-loading" role="status" aria-live="polite"><span>Loading page</span></div>;
}


function formatThrownError(value: unknown): string {
  const seen = new Set<unknown>();
  const format = (error: unknown, depth = 0): string => {
    if (seen.has(error)) return '[circular error cause]';
    if (error && (typeof error === 'object' || typeof error === 'function')) seen.add(error);
    if (error instanceof Error) {
      let text = error.stack || `${error.name}: ${error.message}`;
      if (typeof AggregateError !== 'undefined' && error instanceof AggregateError && error.errors.length) {
        text += error.errors.map((nested, index) => `\n\nAggregate error ${index + 1}:\n${format(nested, depth + 1)}`).join('');
      }
      if ('cause' in error && error.cause !== undefined) text += `\n\nCaused by:\n${format(error.cause, depth + 1)}`;
      return text;
    }
    if (typeof error === 'string') return error;
    try { return JSON.stringify(error, null, 2) || String(error); } catch { return String(error); }
  };
  return format(value);
}

function FatalRouteError(props: { error: unknown; reset: () => void }) {
  return <div class="site-fatal-shell">
    <ErrorBoundary fallback={<header class="site-fatal-topbar-fallback"><a href="/">Go back to home</a></header>}>
      <TopBar />
    </ErrorBoundary>
    <main class="site-fatal-error" role="alert">
      <strong>This view failed to render.</strong>
      <pre class="site-fatal-error-stack">{formatThrownError(props.error)}</pre>
      <div>
        <button type="button" onClick={props.reset}>Retry view</button>
        <button type="button" onClick={() => location.reload()}>Reload page</button>
      </div>
    </main>
  </div>;
}

function RouteError(props: { error: NavigationError; onRetry: () => void; onDismiss: () => void }) {
  return <aside class="site-route-error" role="alert" aria-live="assertive">
    <div><strong>Page failed to load</strong><span>{props.error.message}</span><pre class="site-route-error-stack">{props.error.detail}</pre></div>
    <div class="site-route-error-actions">
      <button type="button" onClick={props.onRetry}>Retry</button>
      <a href={props.error.url}>Open normally</a>
      <button type="button" class="quiet" onClick={props.onDismiss}>Dismiss</button>
    </div>
  </aside>;
}

export function App() {
  const initial: Route = routeFromUrl(new URL(location.href)) ?? { key: 'home', kind: 'home' };
  const [route, setRoute] = createSignal<Route>(initial);
  const [navigationError, setNavigationError] = createSignal<NavigationError | null>(null);
  const projectDetail = () => { const slug = route().slug; return route().kind === 'project' && slug ? details[slug] : undefined; };
  let navigationId = 0;
  let navigationIndex = readNavigationIndex() ?? 0;
  let resetRouteError: (() => void) | undefined;
  const retryRenderedRoute = () => {
    const reset = resetRouteError;
    resetRouteError = undefined;
    reset?.();
  };

  const syncDocument = (next: Route) => {
    document.body.classList.toggle('site-tools-active', next.kind === 'tools');
    document.body.classList.toggle('site-chain-active', next.kind === 'chain');
    document.documentElement.dataset.siteKind = next.kind;
    document.documentElement.dataset.sitePage = next.kind;
    document.documentElement.dataset.homeHref = '/';
    if (next.kind === 'project') document.documentElement.dataset.backHref = '/work/';
    else delete document.documentElement.dataset.backHref;
    document.title = next.kind === 'home' ? 'Sanyam Brar'
      : next.kind === 'work' ? 'Work · Sanyam Brar'
      : next.kind === 'tools' ? 'Tools · Sanyam Brar'
      : next.kind === 'chain' ? 'Chain Reaction'
      : next.kind === 'blog' ? 'Writing · Sanyam Brar'
      : `${(next.slug ? details[next.slug] : undefined)?.title || 'Project'} · Sanyam Brar`;
  };

  const writeHistory = (url: URL, replace: boolean) => {
    if (replace) history.replaceState(navigationState(navigationIndex), '', url);
    else {
      navigationIndex += 1;
      history.pushState(navigationState(navigationIndex), '', url);
    }
  };

  const commitNavigation = (next: Route, url: URL, replace: boolean) => {
    dispatchEvent(new Event('samey-pageleave'));
    setRoute(next);
    setNavigationError(null);
    queueMicrotask(retryRenderedRoute);
    syncDocument(next);
    writeHistory(url, replace);
    dispatchEvent(new CustomEvent('samey-solid-routechange', { detail: { url: url.href, route: next.kind } }));
    queueMicrotask(() => {
      if (url.hash) document.getElementById(hashTarget(url))?.scrollIntoView();
      else scrollTo({ top: 0, left: 0 });
      dispatchEvent(new CustomEvent('samey-pageload', { detail: { url: url.href, solid: true } }));
    });
  };

  const finishNavigation = async (next: Route, url: URL, replace: boolean, requestedDirection?: NavigationDirection) => {
    const direction: NavigationDirection = requestedDirection ?? (next.kind === 'home' ? 'back' : 'forward');
    document.documentElement.dataset.navDirection = direction;
    try {
      await animateRouteSwap(() => commitNavigation(next, url, replace), direction);
    } finally {
      delete document.documentElement.dataset.navDirection;
    }
  };

  const navigate = async (href: string, replace = false, direction?: NavigationDirection) => {
    const id = ++navigationId;
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) { location.assign(url.href); return; }
    cancelSharedPageSwap();
    setNavigationError(null);
    if (url.href === location.href) { retryRenderedRoute(); setLoading(false); return; }
    if (isStandaloneApp(url)) {
      const pageSwap = pageSwapNavigate();
      setLoading(true);
      try {
        if (pageSwap) { await pageSwap(url.href, { replace }); return; }
        location.assign(url.href);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'The game could not be loaded.';
        setNavigationError({ url: url.href, message, detail: formatThrownError(error) });
      } finally { if (id === navigationId) setLoading(false); }
      return;
    }
    if (sameDocumentHash(url)) {
      setLoading(false);
      writeHistory(url, replace);
      document.getElementById(hashTarget(url))?.scrollIntoView();
      return;
    }
    const next = routeFromUrl(url);
    if (!next) {
      const pageSwap = pageSwapNavigate();
      setLoading(true);
      try {
        if (pageSwap) await pageSwap(url.href, {replace});
        else location.assign(url.href);
      } catch (error) {
        if (id === navigationId) setNavigationError({url:url.href,message:error instanceof Error ? error.message : 'The page could not be loaded.',detail:formatThrownError(error)});
      } finally { if (id === navigationId) setLoading(false); }
      return;
    }
    if (next.kind === route().kind && cleanPath(url.pathname) === cleanPath(location.pathname)) {
      writeHistory(url, replace);
      syncDocument(next);
      dispatchEvent(new CustomEvent('samey-solid-routechange', { detail: { url: url.href, route: next.kind } }));
      queueMicrotask(() => { retryRenderedRoute(); dispatchEvent(new CustomEvent('samey-pageload', { detail: { url: url.href, solid: true } })); });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await preload(next);
      if (id !== navigationId) return;
      await finishNavigation(next, url, replace, direction);
    } catch (error) {
      if (id === navigationId) {
        const message = error instanceof Error ? error.message : 'The page module could not be loaded.';
        setNavigationError({ url: url.href, message, detail: formatThrownError(error) });
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
    if (readNavigationIndex() == null) history.replaceState(navigationState(navigationIndex), '', location.href);
    syncDocument(initial);
    globalThis.SameySolidNavigate = navigate;
    globalThis.SameyNavigate = (href, opts) => navigate(href, !!opts?.replace);
    globalThis.SameySolidPreload = href => preloadUrl(new URL(href, location.href));

    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin) return;
      if (sameDocumentHash(url)) return;
      event.preventDefault();
      const direction = anchor.dataset.navDirection === 'back' ? 'back' : undefined;
      void navigate(url.href, false, direction);
    };
    const pop = () => {
      const id = ++navigationId;
      cancelSharedPageSwap();
      const url = new URL(location.href);
      const next = routeFromUrl(url);
      const previousIndex = navigationIndex;
      const targetIndex = readNavigationIndex();
      const direction: NavigationDirection = targetIndex == null
        ? (next?.kind === 'home' ? 'back' : 'forward')
        : targetIndex < previousIndex ? 'back' : 'forward';
      if (targetIndex != null) navigationIndex = targetIndex;
      setNavigationError(null);
      if (!next) {
        const pageSwap = pageSwapNavigate();
        if (!pageSwap) { location.reload(); return; }
        setLoading(true);
        void pageSwap(url.href, {replace: true, force: true}).catch(error => {
          if (id === navigationId) setNavigationError({url:url.href,message:error instanceof Error ? error.message : 'The page could not be restored.',detail:formatThrownError(error)});
        }).finally(() => { if (id === navigationId) setLoading(false); });
        return;
      }
      if (next.key === route().key) {
        setLoading(false);
        syncDocument(next);
        dispatchEvent(new CustomEvent('samey-solid-routechange', { detail: { url: url.href, route: next.kind } }));
        queueMicrotask(() => { retryRenderedRoute(); dispatchEvent(new CustomEvent('samey-pageload', { detail: { url: url.href, solid: true } })); });
        return;
      }
      setLoading(true);
      void preload(next).then(async () => {
        if (id !== navigationId) return;
        document.documentElement.dataset.navDirection = direction;
        try {
          await animateRouteSwap(() => {
            dispatchEvent(new Event('samey-pageleave'));
            setRoute(next);
            syncDocument(next);
            queueMicrotask(() => { retryRenderedRoute(); dispatchEvent(new CustomEvent('samey-pageload', { detail: { url: location.href, solid: true } })); });
          }, direction);
        } finally {
          delete document.documentElement.dataset.navDirection;
          if (id === navigationId) setLoading(false);
        }
      }).catch(error => {
        if (id === navigationId) {
          setLoading(false);
          setNavigationError({ url: url.href, message: error instanceof Error ? error.message : 'The page could not be restored.', detail: formatThrownError(error) });
          dispatchEvent(new CustomEvent('samey-loaderror', { detail: { url: location.href, error } }));
        }
      });
    };

    document.addEventListener('click', click);
    addEventListener('popstate', pop);
    onCleanup(() => {
      document.removeEventListener('click', click);
      removeEventListener('popstate', pop);
      globalThis.SameySolidNavigate = undefined;
      globalThis.SameyNavigate = undefined;
      globalThis.SameySolidPreload = undefined;
    });
  });

  return <div id="solid-site-app">
    <ErrorBoundary fallback={(error, reset) => {
      resetRouteError = reset;
      return <FatalRouteError error={error} reset={() => { resetRouteError = undefined; reset(); }} />;
    }}>
      <Suspense fallback={<RouteLoading/>}>
        <Switch>
          <Match when={route().kind === 'home'}><div class="site-route site-standard"><Home /></div></Match>
          <Match when={route().kind === 'work'}><div class="site-route site-standard"><Work /></div></Match>
          <Match when={route().kind === 'tools'}><div class="site-route tools-page"><Tools /></div></Match>
          <Match when={route().kind === 'chain'}><div class="site-route site-page-chain"><Chain /></div></Match>
          <Match when={route().kind === 'blog'}><div class="site-route site-standard"><Blog /></div></Match>
          <Match when={route().kind === 'project'}>
            <Show when={projectDetail()} keyed>{detail =>
              <div class="site-route site-standard"><Project detail={detail} /></div>
            }</Show>
          </Match>
        </Switch>
      </Suspense>
    </ErrorBoundary>
    <Show when={navigationError()}>{error => <RouteError error={error()} onRetry={retryError} onDismiss={() => setNavigationError(null)}/>}</Show>
  </div>;
}
