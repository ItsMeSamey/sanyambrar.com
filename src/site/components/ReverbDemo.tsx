import { readHistoryState } from '../../shared/history.ts';
import { watchDevicePixelRatio } from '../../shared/devicePixelRatio.ts';
import { onCleanup, onSettled } from 'solid-js';
import demoHtml from '../demos/reverb-home.html?raw';
import { runReverbDemoRuntime, type ReverbDemoDocument } from '../demos/reverb-runtime.ts';

const FULLSCREEN_STATE_KEY = '__sameyReverbFullscreen';
const REVERB_PHONE_WIDTH = 411;
const REVERB_PHONE_HEIGHT = 912;
const REVERB_FULLSCREEN_EXIT_GUTTER = 50;

function animateFrame(frame: HTMLDivElement, before: DOMRect, reduceMotion: boolean) {
  frame.getAnimations().forEach(animation => animation.cancel());
  if (reduceMotion) return;
  const after = frame.getBoundingClientRect();
  if (!before.width || !before.height || !after.width || !after.height) return;
  const dx = before.left - after.left;
  const dy = before.top - after.top;
  const sx = before.width / after.width;
  const sy = before.height / after.height;
  frame.animate([
    { transformOrigin: 'top left', transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})` },
    { transformOrigin: 'top left', transform: 'translate(0,0) scale(1,1)' },
  ], {
    duration: 280,
    easing: 'cubic-bezier(.2,0,0,1)',
  });
}

function installResponsivePhone(host: HTMLDivElement) {
  const sync = () => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (width <= 0 || height <= 0) return;
    const fullscreen = host.hasAttribute('data-fullscreen');
    const naturalScale = Math.min(
      1,
      width / REVERB_PHONE_WIDTH,
      height / REVERB_PHONE_HEIGHT,
    );
    const naturalRightGutter = (width - REVERB_PHONE_WIDTH * naturalScale) / 2;
    const reserveExitGutter = fullscreen && naturalRightGutter < REVERB_FULLSCREEN_EXIT_GUTTER;
    const compact = width < REVERB_PHONE_WIDTH || height < REVERB_PHONE_HEIGHT || reserveExitGutter;
    const scale = reserveExitGutter
      ? Math.min(
          1,
          Math.max(1, width - REVERB_FULLSCREEN_EXIT_GUTTER) / REVERB_PHONE_WIDTH,
          height / REVERB_PHONE_HEIGHT,
        )
      : naturalScale;
    host.toggleAttribute('data-compact-scale', compact);
    if (compact) {
      host.style.setProperty('--reverb-demo-scale', String(scale));
      if (reserveExitGutter) host.style.setProperty('--reverb-demo-phone-left', `${(width - REVERB_FULLSCREEN_EXIT_GUTTER) / 2}px`);
      else host.style.removeProperty('--reverb-demo-phone-left');
    } else {
      host.style.removeProperty('--reverb-demo-scale');
      host.style.removeProperty('--reverb-demo-phone-left');
    }
  };
  const resizeObserver = new ResizeObserver(sync);
  const fullscreenObserver = new MutationObserver(sync);
  resizeObserver.observe(host);
  fullscreenObserver.observe(host, { attributes: true, attributeFilter: ['data-fullscreen'] });
  sync();
  return () => {
    resizeObserver.disconnect();
    fullscreenObserver.disconnect();
    host.removeAttribute('data-compact-scale');
    host.style.removeProperty('--reverb-demo-scale');
    host.style.removeProperty('--reverb-demo-phone-left');
  };
}

function installFullscreen(frame: HTMLDivElement, host: HTMLDivElement, button: HTMLButtonElement) {
  const token = `reverb-${Math.random().toString(36).slice(2)}`;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = false;
  let previousBodyOverflow = '';
  let previousHtmlOverflow = '';
  let releaseBackground = () => {};
  let exitTraversalPending = false;

  const stateIsOurs = () => Boolean(readHistoryState() && readHistoryState()[FULLSCREEN_STATE_KEY] === token);
  const clearOwnedHistoryState = () => {
    const state = readHistoryState();
    if (!state || typeof state !== 'object' || state[FULLSCREEN_STATE_KEY] !== token) return;
    const next = { ...state };
    delete next[FULLSCREEN_STATE_KEY];
    history.replaceState(next, '', location.href);
  };
  const deepActiveElement = () => {
    let activeElement: Element | null = document.activeElement;
    while (activeElement instanceof HTMLElement && activeElement.shadowRoot?.activeElement)
      activeElement = activeElement.shadowRoot.activeElement;
    return activeElement instanceof HTMLElement ? activeElement : null;
  };
  const fullscreenFocusables = () => {
    const result: HTMLElement[] = [];
    const walk = (root: ParentNode) => {
      for (const child of root.children) {
        if (!(child instanceof HTMLElement)) continue;
        if (
          child.matches('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')
          && child.tabIndex >= 0
          && child.getClientRects().length > 0
          && getComputedStyle(child).visibility !== 'hidden'
          && !child.closest('[inert],[aria-hidden="true"]')
        ) result.push(child);
        if (child.shadowRoot) walk(child.shadowRoot);
        walk(child);
      }
    };
    walk(frame);
    return result;
  };
  const isolateBackground = () => {
    const snapshots: { node: HTMLElement; inert: boolean; ariaHidden: string | null }[] = [];
    let branch: HTMLElement = frame;
    while (branch.parentElement) {
      const parent = branch.parentElement;
      for (const sibling of parent.children) {
        if (!(sibling instanceof HTMLElement) || sibling === branch) continue;
        snapshots.push({
          node: sibling,
          inert: sibling.inert,
          ariaHidden: sibling.getAttribute('aria-hidden'),
        });
        sibling.inert = true;
        sibling.setAttribute('aria-hidden', 'true');
      }
      branch = parent;
      if (parent === document.body) break;
    }
    return () => {
      for (const { node, inert, ariaHidden } of snapshots) {
        node.inert = inert;
        if (ariaHidden == null) node.removeAttribute('aria-hidden');
        else node.setAttribute('aria-hidden', ariaHidden);
      }
    };
  };
  const focusOpenInnerModal = () => {
    const shadow = host.shadowRoot;
    const phone = shadow?.querySelector<HTMLElement>('#phone');
    const close = shadow?.querySelector<HTMLElement>('#aboutClose');
    if (!phone?.classList.contains('about-open') || !close) return;
    requestAnimationFrame(() => close.isConnected && close.focus({ preventScroll: true }));
  };

  const setFullscreen = (next: boolean) => {
    if (next === active) return;
    const before = frame.getBoundingClientRect();
    active = next;
    button.classList.toggle('is-active', next);
    button.setAttribute('aria-label', next ? 'Exit fullscreen demo' : 'Fullscreen demo');
    button.setAttribute('aria-pressed', String(next));

    if (next) {
      previousBodyOverflow = document.body.style.overflow;
      previousHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      frame.classList.add('is-fullscreen');
      frame.setAttribute('role', 'dialog');
      frame.setAttribute('aria-modal', 'true');
      frame.setAttribute('aria-label', 'Reverb UI demo fullscreen');
      host.setAttribute('data-fullscreen', '');
      releaseBackground = isolateBackground();
      focusOpenInnerModal();
    } else {
      frame.classList.remove('is-fullscreen');
      frame.removeAttribute('role');
      frame.removeAttribute('aria-modal');
      frame.removeAttribute('aria-label');
      host.removeAttribute('data-fullscreen');
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      releaseBackground();
      releaseBackground = () => {};
      requestAnimationFrame(() => button.isConnected && button.focus({ preventScroll: true }));
    }
    animateFrame(frame, before, reducedMotion());
  };

  const enterFullscreen = () => {
    if (active) return;
    exitTraversalPending = false;
    const state = readHistoryState() && typeof readHistoryState() === 'object' ? readHistoryState() : {};
    history.pushState({ ...state, [FULLSCREEN_STATE_KEY]: token }, '', location.href);
    setFullscreen(true);
  };

  const exitFullscreen = () => {
    if (!active) return;
    if (stateIsOurs()) {
      if (exitTraversalPending) return;
      exitTraversalPending = true;
      history.back();
    }
    else setFullscreen(false);
  };

  const onButtonClick = () => active ? exitFullscreen() : enterFullscreen();
  const onPopState = () => {
    exitTraversalPending = false;
    setFullscreen(stateIsOurs());
  };
  const onPageLeave = () => clearOwnedHistoryState();
  const onGlobalShortcut = (event: KeyboardEvent) => {
    if (!active) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!active) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      exitFullscreen();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = fullscreenFocusables();
    if (!focusable.length) return;
    const current = deepActiveElement();
    const index = current ? focusable.indexOf(current) : -1;
    const wrap = event.shiftKey
      ? index <= 0
      : index < 0 || index === focusable.length - 1;
    if (!wrap) return;
    event.preventDefault();
    (event.shiftKey ? focusable[focusable.length - 1] : focusable[0]).focus({ preventScroll: true });
  };

  button.addEventListener('click', onButtonClick);
  window.addEventListener('popstate', onPopState);
  window.addEventListener('samey-pageleave', onPageLeave);
  window.addEventListener('keydown', onGlobalShortcut, true);
  window.addEventListener('keydown', onKeyDown);

  return () => {
    button.removeEventListener('click', onButtonClick);
    window.removeEventListener('popstate', onPopState);
    window.removeEventListener('samey-pageleave', onPageLeave);
    window.removeEventListener('keydown', onGlobalShortcut, true);
    window.removeEventListener('keydown', onKeyDown);
    clearOwnedHistoryState();
    if (active) {
      frame.classList.remove('is-fullscreen');
      frame.removeAttribute('role');
      frame.removeAttribute('aria-modal');
      frame.removeAttribute('aria-label');
      host.removeAttribute('data-fullscreen');
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      releaseBackground();
    }
  };
}

function mountReverbDemo(host: HTMLDivElement) {
  const parsed = new DOMParser().parseFromString(demoHtml, 'text/html');
  const sourceStyle = parsed.querySelector('style')?.textContent ?? '';
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = sourceStyle
    .split(':root').join(':host')
    .split('html,body').join(':host');
  shadow.append(style);

  for (const node of Array.from(parsed.body.childNodes)) {
    if (node instanceof HTMLScriptElement) continue;
    shadow.append(node.cloneNode(true));
  }

  let disposed = false;
  const rafs = new Set<number>();
  const timers = new Set<number>();
  const requestDemoFrame = (callback: FrameRequestCallback) => {
    let id = 0;
    id = window.requestAnimationFrame(time => {
      rafs.delete(id);
      if (!disposed) callback(time);
    });
    rafs.add(id);
    return id;
  };
  const setDemoTimeout = (handler: (...args: unknown[]) => void, timeout?: number, ...args: unknown[]) => {
    let id = 0;
    id = window.setTimeout(() => {
      timers.delete(id);
      if (!disposed) handler(...args);
    }, timeout);
    timers.add(id);
    return id;
  };
  const clearDemoTimeout = (id?: number) => {
    if (id == null) return;
    timers.delete(id);
    window.clearTimeout(id);
  };

  const demoDocument: ReverbDemoDocument = {
    createElement: document.createElement.bind(document),
    querySelector: selectors => shadow.querySelector(selectors),
    querySelectorAll: selectors => shadow.querySelectorAll(selectors),
    addEventListener: (type, listener, options) => shadow.addEventListener(type, listener, options),
  };
  const addDemoWindowEventListener = (
    type: keyof WindowEventMap,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) => {
    window.addEventListener(type, listener as EventListener, options);
    return () => window.removeEventListener(type, listener as EventListener, options);
  };

  const syncCursorMode = () => host.setAttribute('data-cursor-mode', document.documentElement.dataset.cursorMode || 'invert');
  syncCursorMode();
  const runtime = runReverbDemoRuntime(
    demoDocument,
    requestDemoFrame,
    setDemoTimeout,
    clearDemoTimeout,
    window.devicePixelRatio || 1,
    addDemoWindowEventListener,
  );
  const stopPixelRatioWatch = watchDevicePixelRatio(ratio => runtime.setDevicePixelRatio(ratio));
  const refreshTheme = () => { syncCursorMode(); runtime?.refreshTheme?.(); };
  window.addEventListener('samey-themechange', refreshTheme);

  return () => {
    disposed = true;
    stopPixelRatioWatch();
    runtime.dispose();
    window.removeEventListener('samey-themechange', refreshTheme);
    for (const id of rafs) window.cancelAnimationFrame(id);
    for (const id of timers) window.clearTimeout(id);
    rafs.clear();
    timers.clear();
    shadow.replaceChildren();
  };
}

export function ReverbDemo() {
  let frame!: HTMLDivElement;
  let host!: HTMLDivElement;
  let fullscreenButton!: HTMLButtonElement;
  let dispose = () => {};
  onSettled(() => {
    const disposeDemo = mountReverbDemo(host);
    const disposeScale = installResponsivePhone(host);
    const disposeFullscreen = installFullscreen(frame, host, fullscreenButton);
    dispose = () => { disposeFullscreen(); disposeScale(); disposeDemo(); };
  });
  onCleanup(() => dispose());
  return <section class="reverb-demo-section" aria-labelledby="reverb-ui-demo-title">
    <div class="reverb-demo-head">
      <h2 id="reverb-ui-demo-title">UI demo</h2>
    </div>
    <div class="reverb-demo-frame-shell">
      <div ref={frame} class="reverb-demo-frame">
        <div ref={host} class="reverb-demo-host" role="group" aria-label="Interactive Reverb UI demo" />
        <button ref={fullscreenButton} class="reverb-demo-fullscreen-button" type="button" aria-label="Fullscreen demo" aria-pressed="false">
          <svg class="expand-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5v2H6v3H4zm11-5h5v5h-2V6h-3V4zM6 15v3h3v2H4v-5h2zm12 3v-3h2v5h-5v-2h3z"/></svg>
          <svg class="collapse-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4V7h3V4h2zm6 0h2v3h3v2h-5V4zM4 15h5v5H7v-3H4v-2zm11 0h5v2h-3v3h-2v-5z"/></svg>
        </button>
      </div>
    </div>
  </section>;
}
