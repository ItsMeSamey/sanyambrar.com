import { onCleanup, onMount } from 'solid-js';
import demoHtml from '../demos/reverb-home.html' with { type: 'text' };
import { runReverbDemoRuntime } from '../demos/reverb-runtime.js';

type DemoDocument = Pick<Document, 'createElement'> & {
  getElementById(id: string): HTMLElement | null;
  querySelector<E extends Element = Element>(selectors: string): E | null;
  querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E>;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
};

const FULLSCREEN_STATE_KEY = '__sameyReverbFullscreen';

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

function installFullscreen(frame: HTMLDivElement, host: HTMLDivElement, button: HTMLButtonElement) {
  const token = `reverb-${Math.random().toString(36).slice(2)}`;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = false;
  let previousBodyOverflow = '';
  let previousHtmlOverflow = '';

  const stateIsOurs = () => Boolean(history.state && history.state[FULLSCREEN_STATE_KEY] === token);

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
      host.setAttribute('data-fullscreen', '');
    } else {
      frame.classList.remove('is-fullscreen');
      host.removeAttribute('data-fullscreen');
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    }
    animateFrame(frame, before, reduceMotion);
  };

  const enterFullscreen = () => {
    if (active) return;
    const state = history.state && typeof history.state === 'object' ? history.state : {};
    history.pushState({ ...state, [FULLSCREEN_STATE_KEY]: token }, '', location.href);
    setFullscreen(true);
  };

  const exitFullscreen = () => {
    if (!active) return;
    if (stateIsOurs()) history.back();
    else setFullscreen(false);
  };

  const onButtonClick = () => active ? exitFullscreen() : enterFullscreen();
  const onPopState = () => setFullscreen(stateIsOurs());

  button.addEventListener('click', onButtonClick);
  window.addEventListener('popstate', onPopState);

  return () => {
    button.removeEventListener('click', onButtonClick);
    window.removeEventListener('popstate', onPopState);
    if (active) {
      frame.classList.remove('is-fullscreen');
      host.removeAttribute('data-fullscreen');
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
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
  const setDemoTimeout = (handler: (...args: any[]) => void, timeout?: number, ...args: any[]) => {
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

  const demoDocument: DemoDocument = {
    createElement: document.createElement.bind(document),
    getElementById: id => shadow.querySelector<HTMLElement>(`#${id}`),
    querySelector: selectors => shadow.querySelector(selectors),
    querySelectorAll: selectors => shadow.querySelectorAll(selectors),
    addEventListener: (type, listener, options) => shadow.addEventListener(type, listener, options),
  };

  const syncCursorMode = () => host.setAttribute('data-cursor-mode', document.documentElement.dataset.cursorMode || 'invert');
  syncCursorMode();
  const runtime = runReverbDemoRuntime(demoDocument, requestDemoFrame, setDemoTimeout, clearDemoTimeout, window.devicePixelRatio || 1);
  const refreshTheme = () => { syncCursorMode(); runtime?.refreshTheme?.(); };
  window.addEventListener('samey-themechange', refreshTheme);

  return () => {
    disposed = true;
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
  onMount(() => {
    const disposeDemo = mountReverbDemo(host);
    const disposeFullscreen = installFullscreen(frame, host, fullscreenButton);
    dispose = () => { disposeFullscreen(); disposeDemo(); };
  });
  onCleanup(() => dispose());
  return <section class="reverb-demo-section" aria-labelledby="reverb-ui-demo-title">
    <div class="reverb-demo-head"><h2 id="reverb-ui-demo-title">UI demo</h2></div>
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
