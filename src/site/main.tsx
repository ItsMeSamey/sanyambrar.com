import { onSharedRuntimeReady } from '../shared/runtimeReady.ts';
import { afterVisualTransition } from '../shared/afterVisualTransition.ts';

type SiteRuntime = {
  web: typeof import('@solidjs/web');
  site: typeof import('./App');
};

let runtimeTask: Promise<SiteRuntime> | undefined;
const loadSiteRuntime = () => runtimeTask ??= Promise.all([
  import('@solidjs/web'),
  import('./App'),
]).then(([web, site]) => ({ web, site }));

const looksLikeSolidRoute = (url: URL) => {
  const path = url.pathname.replace(/\.html$/, '').replace(/\/index$/, '').replace(/\/$/, '') || '/';
  return path === '/' || path === '/work' || path === '/tools' || path === '/chain' || path === '/blog'
    || /^\/projects\/[^/]+$/.test(path);
};

const preloadSolidRoute = (href: string): boolean => {
  let url: URL;
  try { url = new URL(href, location.href); }
  catch (error) {
    console.debug('Solid route preload URL was invalid', error);
    return false;
  }
  if (url.origin !== location.origin
    || !document.documentElement.hasAttribute('data-site-spa')
    || !looksLikeSolidRoute(url)) return false;
  void loadSiteRuntime().then(({ site }) => {
    if (site.ownsSiteRoute(url)) return site.preloadSiteRoute(url);
  }).catch(error => console.debug('Solid route preload failed', error));
  return true;
};

let disposeCurrent: (() => void) | undefined;
let pendingMount: Promise<void> | undefined;
let cancelPendingMount = () => {};
let mountGeneration = 0;
const siteRoot = () => document.getElementById('site-root');
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const focusedIndex = (root: HTMLElement) => {
  const active = document.activeElement;
  return active instanceof HTMLElement && root.contains(active)
    ? [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].indexOf(active)
    : -1;
};

function mountSolidSite() {
  globalThis.SameySolidPreload = preloadSolidRoute;
  if (disposeCurrent || pendingMount) return;
  const root = siteRoot();
  if (!root) throw new Error('Site mount node #site-root is missing');
  const generation = ++mountGeneration;
  const prerendered = root.hasAttribute('data-samey-prerendered');
  const mount = async () => {
    const { web, site } = await loadSiteRuntime();
    if (prerendered) await site.preloadSiteRoute(new URL(location.href));
    if (generation !== mountGeneration || root !== siteRoot() || !root.isConnected) return;
    const focusIndex = prerendered ? focusedIndex(root) : -1;
    if (prerendered) root.replaceChildren();
    disposeCurrent = web.render(() => web.createComponent(site.App, {}), root);
    root.removeAttribute('data-samey-prerendered');
    root.setAttribute('data-samey-solid-mounted', '');
    if (focusIndex >= 0)
      queueMicrotask(() => root.querySelectorAll<HTMLElement>(FOCUSABLE)[focusIndex]?.focus({ preventScroll: true }));
  };

  const task = new Promise<void>((resolve, reject) => {
    const start = () => { void mount().then(resolve, reject); };
    if (prerendered) {
      cancelPendingMount = afterVisualTransition(() => {
        cancelPendingMount = () => {};
        start();
      });
    } else start();
  });
  pendingMount = task;
  void task.finally(() => { if (pendingMount === task) pendingMount = undefined; });
}

function disposeSolidSite() {
  mountGeneration += 1;
  if (globalThis.SameySolidPreload === preloadSolidRoute) globalThis.SameySolidPreload = undefined;
  cancelPendingMount();
  cancelPendingMount = () => {};
  pendingMount = undefined;
  disposeCurrent?.();
  disposeCurrent = undefined;
  siteRoot()?.removeAttribute('data-samey-solid-mounted');
}

Object.assign(globalThis, { SameyMountSolid: mountSolidSite, SameySolidDispose: disposeSolidSite });
onSharedRuntimeReady(mountSolidSite);
