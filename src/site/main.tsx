import { createComponent, render } from '@solidjs/web';
import { App, preloadSiteRoute } from './App';

let disposeCurrent: (() => void) | undefined;
let pendingMount: Promise<void> | undefined;
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
  if (disposeCurrent || pendingMount) return;
  const root = siteRoot();
  if (!root) throw new Error('Site mount node #site-root is missing');
  const generation = ++mountGeneration;
  if (!root.hasAttribute('data-samey-prerendered')) {
    disposeCurrent = render(() => createComponent(App, {}), root);
    root.setAttribute('data-samey-solid-mounted', '');
    return;
  }
  const task = preloadSiteRoute(new URL(location.href)).then(() => {
    if (generation !== mountGeneration || root !== siteRoot() || !root.isConnected) return;
    const focusIndex = focusedIndex(root);
    root.replaceChildren();
    disposeCurrent = render(() => createComponent(App, {}), root);
    root.removeAttribute('data-samey-prerendered');
    root.setAttribute('data-samey-solid-mounted', '');
    if (focusIndex >= 0)
      queueMicrotask(() => root.querySelectorAll<HTMLElement>(FOCUSABLE)[focusIndex]?.focus({ preventScroll: true }));
  });
  pendingMount = task;
  void task.finally(() => { if (pendingMount === task) pendingMount = undefined; });
}

function disposeSolidSite() {
  mountGeneration += 1;
  pendingMount = undefined;
  disposeCurrent?.();
  disposeCurrent = undefined;
  siteRoot()?.removeAttribute('data-samey-solid-mounted');
}

Object.assign(globalThis, { SameyMountSolid: mountSolidSite, SameySolidDispose: disposeSolidSite });
mountSolidSite();
