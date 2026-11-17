import { onSharedRuntimeReady } from '../shared/runtimeReady.ts';
import { afterVisualTransition } from '../shared/afterVisualTransition.ts';
import { resilientImport } from '../shared/resilientImport.ts';
import { formatThrownError } from '../shared/error.ts';

type SiteRuntime = {
  web: typeof import('@solidjs/web');
  site: typeof import('./App');
};

let runtimeTask: Promise<SiteRuntime> | undefined;
const loadSiteRuntime = () => runtimeTask ??= resilientImport(() => Promise.all([
  import('@solidjs/web'),
  import('./App'),
]).then(([web, site]) => ({ web, site }))).catch(error => {
  runtimeTask = undefined;
  throw error;
});

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
let recoveryPanel: HTMLElement | undefined;
const siteRoot = () => document.getElementById('site-root');
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const focusedIndex = (root: HTMLElement) => {
  const active = document.activeElement;
  return active instanceof HTMLElement && root.contains(active)
    ? [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].indexOf(active)
    : -1;
};

function clearMountError() {
  recoveryPanel?.remove();
  recoveryPanel = undefined;
}

function showMountError(root: HTMLElement, error: unknown, restoreFocus: boolean) {
  clearMountError();
  const panel = document.createElement('section');
  panel.className = 'site-bootstrap-error';
  panel.setAttribute('role', 'alert');
  const message = document.createElement('p');
  message.textContent = 'Interactive controls could not load.';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Retry';
  retry.addEventListener('click', () => {
    clearMountError();
    mountSolidSite(true);
  });
  const reload = document.createElement('button');
  reload.type = 'button';
  reload.textContent = 'Reload page';
  reload.addEventListener('click', () => location.reload());
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'Error details';
  const stack = document.createElement('pre');
  stack.className = 'samey-error-stack';
  stack.textContent = formatThrownError(error);
  details.append(summary, stack);
  panel.append(message, retry, reload, details);
  root.before(panel);
  recoveryPanel = panel;
  if (restoreFocus) retry.focus({ preventScroll: true });
}

function mountSolidSite(restoreFocus = false) {
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
    const previousChildren = prerendered ? [...root.childNodes] : [];
    try {
      if (prerendered) root.replaceChildren();
      disposeCurrent = web.render(() => web.createComponent(site.App, {}), root);
    } catch (error) {
      if (prerendered) root.replaceChildren(...previousChildren);
      throw error;
    }
    clearMountError();
    root.removeAttribute('data-samey-prerendered');
    root.setAttribute('data-samey-solid-mounted', '');
    if (focusIndex >= 0)
      queueMicrotask(() => root.querySelectorAll<HTMLElement>(FOCUSABLE)[focusIndex]?.focus({ preventScroll: true }));
    else if (restoreFocus) queueMicrotask(() => {
      const heading = root.querySelector<HTMLElement>('h1');
      if (!heading) return;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    });
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
  void task.then(
    () => { if (pendingMount === task) pendingMount = undefined; },
    error => {
      if (pendingMount === task) pendingMount = undefined;
      if (generation !== mountGeneration || root !== siteRoot() || !root.isConnected) return;
      showMountError(root, error, restoreFocus);
    },
  );
}

function disposeSolidSite() {
  mountGeneration += 1;
  if (globalThis.SameySolidPreload === preloadSolidRoute) globalThis.SameySolidPreload = undefined;
  cancelPendingMount();
  cancelPendingMount = () => {};
  pendingMount = undefined;
  clearMountError();
  disposeCurrent?.();
  disposeCurrent = undefined;
  siteRoot()?.removeAttribute('data-samey-solid-mounted');
}

Object.assign(globalThis, { SameyMountSolid: mountSolidSite, SameySolidDispose: disposeSolidSite });
onSharedRuntimeReady(mountSolidSite);
