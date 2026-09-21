export function onSharedRuntimeReady(callback: () => void): () => void {
  if (globalThis.SameyAppearance) {
    queueMicrotask(callback);
    return () => {};
  }
  const ready = () => callback();
  addEventListener('samey-runtime-ready', ready, { once: true });
  return () => removeEventListener('samey-runtime-ready', ready);
}
