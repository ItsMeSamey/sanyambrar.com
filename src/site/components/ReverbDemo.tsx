import { onCleanup, onMount } from 'solid-js';
import demoHtml from '../demos/reverb-home.html' with { type: 'text' };
import { runReverbDemoRuntime } from '../demos/reverb-runtime.js';

type DemoDocument = Pick<Document, 'createElement'> & {
  getElementById(id: string): HTMLElement | null;
  querySelector<E extends Element = Element>(selectors: string): E | null;
  querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E>;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
};

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

  runReverbDemoRuntime(demoDocument, requestDemoFrame, setDemoTimeout, clearDemoTimeout, window.devicePixelRatio || 1);

  return () => {
    disposed = true;
    for (const id of rafs) window.cancelAnimationFrame(id);
    for (const id of timers) window.clearTimeout(id);
    rafs.clear();
    timers.clear();
    shadow.replaceChildren();
  };
}

export function ReverbDemo() {
  let host!: HTMLDivElement;
  let dispose = () => {};
  onMount(() => { dispose = mountReverbDemo(host); });
  onCleanup(() => dispose());
  return <section class="detail-copy reverb-demo-section" aria-labelledby="reverb-ui-demo-title">
    <div class="reverb-demo-head">
      <div>
        <h2 id="reverb-ui-demo-title">UI demo</h2>
        <p>Interactive mock of Reverb's current Android interface.</p>
      </div>
      <span>Interactive</span>
    </div>
    <div ref={host} class="reverb-demo-host" role="group" aria-label="Interactive Reverb UI demo" />
  </section>;
}
