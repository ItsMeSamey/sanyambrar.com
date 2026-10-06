type LayerState = { layers: HTMLElement[] };
const stateKey = Symbol.for('samey.overlay-order');

function layerState(): LayerState {
  // The shared runtime and individual apps can load separate module bundles.
  const host = globalThis as typeof globalThis & { [key: symbol]: LayerState | undefined };
  if (host[stateKey]) return host[stateKey];
  const state: LayerState = { layers: [] };
  host[stateKey] = state;
  document.addEventListener('beforetoggle', event => {
    const element = event.target;
    if (!(element instanceof HTMLElement) || element.hasAttribute('data-samey-layer-decoration') || !element.matches('[popover], dialog')) return;
    state.layers = state.layers.filter(layer => layer !== element && layer.isConnected);
    if ((event as ToggleEvent).newState === 'open') state.layers.push(element);
    queueMicrotask(() => dispatchEvent(new Event('samey-layer-change')));
  }, true);
  return state;
}

if (typeof document !== 'undefined') layerState();

export function topLayer(): HTMLElement | undefined {
  const state = layerState();
  state.layers = state.layers.filter(layer => layer.isConnected);
  return [...state.layers].reverse().find(layer => layer.matches(':popover-open, :modal'));
}

export function isTopLayer(element: HTMLElement | undefined | null): boolean {
  if (!element) return false;
  const top = topLayer();
  return !!top && (top === element || top.contains(element));
}

export function showLayer(element: HTMLElement): void {
  if (!element.isConnected) return;
  layerState();
  element.popover = 'manual';
  if (element.matches(':popover-open')) element.hidePopover();
  element.showPopover();
}

export function hideLayer(element: HTMLElement): void {
  if (element.matches(':popover-open')) element.hidePopover();
  // Removing an open popover from the DOM can bypass its closing event.
  const state = layerState();
  if (!state.layers.includes(element)) return;
  state.layers = state.layers.filter(layer => layer !== element && layer.isConnected);
  queueMicrotask(() => dispatchEvent(new Event('samey-layer-change')));
}
