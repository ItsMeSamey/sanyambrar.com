import { navigationState, readNavigationIndex } from '../shared/history.ts';
import { Errored, Match, Show, Loading, Switch, createSignal, lazy, onCleanup, onSettled } from 'solid-js';
import { TopBar } from '../shared/components/TopBar.tsx';
import { animateRootSwap } from '../shared/transitions.ts';
import { formatThrownError } from '../shared/error.ts';
import { resilientImport } from '../shared/resilientImport.ts';
import { activateRouteStyles as settleRouteStyles, preloadStyleManifest, prepareStyles, type PreparedStyles } from '../shared/stylesheets.ts';
import { details } from './data';
import { ProjectDemo, preloadProjectDemo } from './components/ProjectDemo.tsx';

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
    // Vite's preload helper treats a staged stylesheet href as loaded. Own
    // readiness before every import, including initial renders and retries.
    task = prepareStyles(kind).then<unknown>(() => rawLoaders[kind]()).catch(error => {
      moduleCache.delete(kind);
      throw error;
    });
    moduleCache.set(kind, task);
  }
  return task as ReturnType<(typeof rawLoaders)[K]>;
};

const Home = lazy(() => loadModule('home'), { export: 'Home' });
const Work = lazy(() => loadModule('work'), { export: 'Work' });
const Tools = lazy(() => loadModule('tools'), { export: 'ToolsPage' });
const Chain = lazy(() => loadModule('chain'), { export: 'ChainPage' });
const Project = lazy(() => loadModule('project'), { export: 'ProjectPage' });
const Blog = lazy(() => loadModule('blog'), { export: 'Blog' });

const preloadLazyRoute = (kind: RouteKind) => ({
  home: Home.preload,
  work: Work.preload,
  tools: Tools.preload,
  chain: Chain.preload,
  project: Project.preload,
  blog: Blog.preload,
}[kind]());

type Route = { key: string; kind: RouteKind; slug?: string };
type NavigationDirection = 'forward' | 'back';
type NavigationError = { url: string; returnUrl: string; message: string; detail: string };
type PreparedRouteStyles = PreparedStyles;
const cleanPath = (path: string) => path.replace(/\.html$/, '').replace(/\/index$/, '').replace(/\/$/, '') || '/';
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

export const ownsSiteRoute = (url: URL) => routeFromUrl(url) != null;

const sameDocumentHash = (url: URL) => cleanPath(url.pathname) === cleanPath(location.pathname) && url.search === location.search && !!url.hash;
const usesDocumentNavigation = (route: Route) => route.kind === 'project'
  && !!route.slug
  && !!details[route.slug]?.demo;
const hashTarget = (url: URL) => {
  if (!url.hash) return '';
  try { return decodeURIComponent(url.hash.slice(1)); } catch { return url.hash.slice(1); }
};
const prepareRouteStyles = (route: Route): Promise<PreparedRouteStyles> => prepareStyles(route.kind);

const preloadRouteDependencies = async (route: Route) => {
  const [module] = await Promise.all([
    loadModule(route.kind),
    preloadLazyRoute(route.kind),
  ]) as [{ preloadChainEngine?: () => Promise<unknown> }, unknown];
  if (route.kind === 'chain') await module.preloadChainEngine?.();
  if (route.kind !== 'project' || !route.slug) return;
  const demo = details[route.slug]?.demo;
  if (demo) await preloadProjectDemo(demo);
};
const prepareSiteRoute = async (route: Route) => {
  const styles = prepareRouteStyles(route);
  await Promise.all([styles, preloadRouteDependencies(route)]);
  return styles;
};
export const preloadSiteRoute = async (url: URL) => {
  const route = routeFromUrl(url);
  if (route) await prepareSiteRoute(route);
};
const setLoading = (value: boolean) => {
  globalThis.SameyLoading?.(value);
  document.documentElement.toggleAttribute('data-solid-loading', value);
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
  onSettled(() => {
    releaseLoading = globalThis.SameyLoadingBegin?.() ?? (() => {});
  });
  onCleanup(() => releaseLoading());
  return <div class="site-route-loading" role="status" aria-live="polite"><span>Loading page</span></div>;
}


function FatalRouteError(props: { error: unknown; reset: () => void }) {
  return <div class="site-fatal-shell">
    <Errored fallback={<header class="site-fatal-topbar-fallback"><a href="/">Go back to home</a></header>}>
      <TopBar />
    </Errored>
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

function isolateErrorPage(page: HTMLElement) {
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const siblings = [...(page.parentElement?.children ?? [])].filter(
    (node): node is HTMLElement => node instanceof HTMLElement && node !== page,
  );
  const snapshots = siblings.map(node => ({
    node,
    inert: node.inert,
    ariaHidden: node.getAttribute('aria-hidden'),
  }));
  for (const { node } of snapshots) {
    node.inert = true;
    node.setAttribute('aria-hidden', 'true');
  }
  queueMicrotask(() => page.focus({ preventScroll: true }));
  return () => {
    for (const { node, inert, ariaHidden } of snapshots) {
      node.inert = inert;
      if (ariaHidden == null) node.removeAttribute('aria-hidden');
      else node.setAttribute('aria-hidden', ariaHidden);
    }
    if (previousFocus?.isConnected) queueMicrotask(() => previousFocus.focus({ preventScroll: true }));
  };
}

function RouteError(props: { error: NavigationError; onRetry: () => void; onGoBack: () => void }) {
  let page!: HTMLElement;
  onSettled(() => isolateErrorPage(page));
  const destination = () => {
    try {
      const url = new URL(props.error.url, location.href);
      return url.pathname + url.search + url.hash;
    } catch {
      return props.error.url;
    }
  };
  return <section
    ref={page}
    class="site-route-error samey-error-page"
    role="alert"
    aria-live="assertive"
    aria-labelledby="site-route-error-title"
    tabindex="-1"
  >
    <div class="samey-error-page-panel">
      <span class="samey-error-page-kicker">Navigation error</span>
      <h1 id="site-route-error-title">Page failed to load</h1>
      <p class="samey-error-page-message">{props.error.message}</p>
      <div class="samey-error-page-target"><span>Destination</span><code>{destination()}</code></div>
      <pre class="site-route-error-stack samey-error-stack" tabindex="0">{props.error.detail}</pre>
      <div class="site-route-error-actions samey-error-page-actions">
        <button type="button" class="primary" onClick={props.onRetry}>Retry</button>
        <a href={props.error.url} data-samey-native-nav>Open normally</a>
        <button type="button" class="quiet" onClick={props.onGoBack}>Go back</button>
      </div>
    </div>
  </section>;
}

export function App(props: { initialUrl?: string } = {}) {
  const initialUrl = props.initialUrl ? new URL(props.initialUrl) : new URL(location.href);
  const initial: Route = routeFromUrl(initialUrl) ?? { key: 'home', kind: 'home' };
  const [route, setRoute] = createSignal<Route>(initial);
  const [navigationError, setNavigationError] = createSignal<NavigationError | null>(null);
  const projectDetail = () => { const slug = route().slug; return route().kind === 'project' && slug ? details[slug] : undefined; };
  let navigationId = 0;
  let navigationIndex = props.initialUrl ? 0 : readNavigationIndex() ?? 0;
  let lastStableUrl = initialUrl.href;
  let resetRouteError: (() => void) | undefined;
  const navigationFailure = (url: URL, error: unknown, fallback: string): NavigationError => ({
    url: url.href,
    returnUrl: lastStableUrl,
    message: error instanceof Error ? error.message : fallback,
    detail: formatThrownError(error),
  });
  const retryRenderedRoute = () => {
    const reset = resetRouteError;
    resetRouteError = undefined;
    reset?.();
  };

  const syncDocument = (next: Route) => {
    document.body.classList.toggle('site-tools-active', next.kind === 'tools');
    document.body.classList.toggle('site-chain-active', next.kind === 'chain');
    document.documentElement.dataset.siteKind = next.kind;
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

  const focusDestination = (id: number, previous: Element | null) => {
    requestAnimationFrame(() => {
      if (id !== navigationId) return;
      const active = document.activeElement;
      if (active !== document.body && active !== previous && active?.isConnected) return;
      const root = document.querySelector<HTMLElement>('.site-route');
      const target = root?.querySelector<HTMLElement>('h1') ?? root?.querySelector<HTMLElement>('main') ?? root;
      if (!target) return;
      if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    });
  };

  const commitNavigation = (next: Route, url: URL, replace: boolean, id: number) => {
    const previousFocus = document.activeElement;
    dispatchEvent(new Event('samey-pageleave'));
    setRoute(next);
    setNavigationError(null);
    queueMicrotask(retryRenderedRoute);
    syncDocument(next);
    writeHistory(url, replace);
    lastStableUrl = url.href;
    focusDestination(id, previousFocus);
    dispatchEvent(new CustomEvent('samey-solid-routechange', { detail: { url: url.href, route: next.kind } }));
    queueMicrotask(() => {
      if (id !== navigationId) return;
      if (url.hash) document.getElementById(hashTarget(url))?.scrollIntoView();
      else scrollTo({ top: 0, left: 0 });
      dispatchEvent(new CustomEvent('samey-pageload', { detail: { url: url.href, solid: true } }));
    });
  };

  const finishNavigation = async (next: Route, url: URL, replace: boolean, preparedStyles: PreparedRouteStyles, id: number, requestedDirection?: NavigationDirection) => {
    const direction: NavigationDirection = requestedDirection ?? (next.kind === 'home' ? 'back' : 'forward');
    document.documentElement.dataset.navDirection = direction;
    try {
      await animateRouteSwap(() => {
        if (id !== navigationId) return;
        settleRouteStyles(preparedStyles);
        commitNavigation(next, url, replace, id);
      }, direction);
    } finally {
      if (id === navigationId) delete document.documentElement.dataset.navDirection;
    }
  };

  const navigate = async (href: string, replace = false, direction?: NavigationDirection) => {
    const id = ++navigationId;
    delete document.documentElement.dataset.navDirection;
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) { location.assign(url.href); return; }
    setNavigationError(null);
    if (url.href === location.href && routeFromUrl(url)?.key === route().key) { retryRenderedRoute(); setLoading(false); return; }
    if (url.href === location.href) replace = true;
    dispatchEvent(new Event('samey-navigationstart'));
    if (sameDocumentHash(url) && routeFromUrl(url)?.key === route().key) {
      setLoading(false);
      writeHistory(url, replace);
      lastStableUrl = url.href;
      document.getElementById(hashTarget(url))?.scrollIntoView();
      return;
    }
    const next = routeFromUrl(url);
    if (!next) {
      setLoading(false);
      if (globalThis.SameyDocumentNavigate) globalThis.SameyDocumentNavigate(url.href, replace);
      else if (replace) location.replace(url.href);
      else location.assign(url.href);
      return;
    }
    if (usesDocumentNavigation(next)) {
      setLoading(false);
      if (globalThis.SameyDocumentNavigate) globalThis.SameyDocumentNavigate(url.href, replace);
      else if (replace) location.replace(url.href);
      else location.assign(url.href);
      return;
    }
    if (next.key === route().key && cleanPath(url.pathname) === cleanPath(location.pathname)) {
      writeHistory(url, replace);
      lastStableUrl = url.href;
      syncDocument(next);
      dispatchEvent(new CustomEvent('samey-solid-routechange', { detail: { url: url.href, route: next.kind } }));
      queueMicrotask(() => { retryRenderedRoute(); dispatchEvent(new CustomEvent('samey-pageload', { detail: { url: url.href, solid: true } })); });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const preparedStyles = await prepareSiteRoute(next);
      if (id !== navigationId) return;
      await finishNavigation(next, url, replace, preparedStyles, id, direction);
    } catch (error) {
      if (id === navigationId) {
        try {
          const styles = await prepareRouteStyles(route());
          if (id !== navigationId) return;
          settleRouteStyles(styles);
        } catch {}
        if (id !== navigationId) return;
        setNavigationError(navigationFailure(url, error, 'The page module could not be loaded.'));
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
    if (url.href === location.href) { location.reload(); return; }
    void navigate(url.href);
  };
  const goBackError = () => {
    const error = navigationError();
    if (!error) return;
    const target = new URL(error.returnUrl, location.href);
    setNavigationError(null);
    if (target.href !== location.href) location.replace(target.href);
  };

  onSettled(() => {
    if (readNavigationIndex() == null) history.replaceState(navigationState(navigationIndex), '', location.href);
    syncDocument(initial);
    void preloadStyleManifest().catch(error => console.debug('Route asset manifest warmup failed', error));
    const sharedPreloadPage = globalThis.SameyPreloadPage;
    const preloadSiteHref = (href: string) => {
      try {
        const url = new URL(href, location.href);
        const next = routeFromUrl(url);
        if (next) {
          void prepareSiteRoute(next).catch(error => console.debug('Route warmup failed', url.href, error));
          if (usesDocumentNavigation(next)) sharedPreloadPage?.(url.href);
        }
        else sharedPreloadPage?.(url.href);
      } catch {}
    };
    globalThis.SameyPreloadPage = preloadSiteHref;
    globalThis.SameyNavigate = (href, opts) => navigate(href, !!opts?.replace);
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target || anchor.hasAttribute('download') || anchor.hasAttribute('data-samey-native-nav')) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin) return;
      if (sameDocumentHash(url)) return;
      const next = routeFromUrl(url);
      if (!next || usesDocumentNavigation(next)) return;
      event.preventDefault();
      const direction = anchor.dataset.navDirection === 'back' ? 'back' : undefined;
      void navigate(url.href, false, direction);
    };
    const pop = () => {
      const id = ++navigationId;
      delete document.documentElement.dataset.navDirection;
      const url = new URL(location.href);
      const next = routeFromUrl(url);
      const previousIndex = navigationIndex;
      const targetIndex = readNavigationIndex();
      const direction: NavigationDirection = targetIndex == null
        ? (next?.kind === 'home' ? 'back' : 'forward')
        : targetIndex < previousIndex ? 'back' : 'forward';
      if (targetIndex != null) navigationIndex = targetIndex;
      setNavigationError(null);
      dispatchEvent(new Event('samey-navigationstart'));
      if (!next) {
        location.reload();
        return;
      }
      if (next.key === route().key) {
        setLoading(false);
        lastStableUrl = url.href;
        syncDocument(next);
        dispatchEvent(new CustomEvent('samey-solid-routechange', { detail: { url: url.href, route: next.kind } }));
        queueMicrotask(() => { retryRenderedRoute(); dispatchEvent(new CustomEvent('samey-pageload', { detail: { url: url.href, solid: true } })); });
        return;
      }
      setLoading(true);
      void prepareSiteRoute(next).then(async preparedStyles => {
        if (id !== navigationId) return;
        document.documentElement.dataset.navDirection = direction;
        try {
          await animateRouteSwap(() => {
            if (id !== navigationId) return;
            const previousFocus = document.activeElement;
            settleRouteStyles(preparedStyles);
            dispatchEvent(new Event('samey-pageleave'));
            setRoute(next);
            syncDocument(next);
            lastStableUrl = url.href;
            focusDestination(id, previousFocus);
            queueMicrotask(() => {
              if (id !== navigationId) return;
              retryRenderedRoute();
              dispatchEvent(new CustomEvent('samey-pageload', { detail: { url: url.href, solid: true } }));
            });
          }, direction);
        } finally {
          if (id === navigationId) delete document.documentElement.dataset.navDirection;
          if (id === navigationId) setLoading(false);
        }
      }).catch((error: unknown) => {
        if (id === navigationId) {
          setLoading(false);
          void prepareRouteStyles(route()).then(styles => { if (id === navigationId) settleRouteStyles(styles); }).catch(() => {});
          setNavigationError(navigationFailure(url, error, 'The page could not be restored.'));
        }
      });
    };

    document.addEventListener('click', click);
    addEventListener('popstate', pop);
    return () => {
      navigationId += 1;
      document.removeEventListener('click', click);
      removeEventListener('popstate', pop);
      if (globalThis.SameyPreloadPage === preloadSiteHref) globalThis.SameyPreloadPage = sharedPreloadPage;
      globalThis.SameyNavigate = undefined;
    };
  });

  return <div id="solid-site-app">
    <Errored fallback={(error, reset) => {
      resetRouteError = reset;
      return <FatalRouteError error={error()} reset={() => { resetRouteError = undefined; reset(); }} />;
    }}>
      <Loading fallback={<RouteLoading/>}>
        <Switch>
          <Match when={route().kind === 'home'}><div class="site-route site-standard"><Home /></div></Match>
          <Match when={route().kind === 'work'}><div class="site-route site-standard"><Work /></div></Match>
          <Match when={route().kind === 'tools'}><div class="site-route tools-page"><Tools /></div></Match>
          <Match when={route().kind === 'chain'}><div class="site-route site-page-chain"><Chain /></div></Match>
          <Match when={route().kind === 'blog'}><div class="site-route site-standard"><Blog /></div></Match>
          <Match when={route().kind === 'project'}>
            <Show when={projectDetail()} keyed>{detail =>
              <div class="site-route site-standard">
                <Project
                  detail={detail}
                  demo={<Show when={detail.demo}>{id => <ProjectDemo id={id()}/>}</Show>}
                />
              </div>
            }</Show>
          </Match>
        </Switch>
      </Loading>
    </Errored>
    <Show when={navigationError()}>{error => <RouteError error={error()} onRetry={retryError} onGoBack={goBackError}/>}</Show>
  </div>;
}
