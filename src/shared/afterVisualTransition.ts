const transitionActive = () =>
  document.documentElement.hasAttribute('data-samey-route-transition')
  || document.documentElement.hasAttribute('data-samey-document-transition');

export function afterVisualTransition(callback: () => void): () => void {
  let cancelled = false;
  let frame = 0;
  let listening = false;

  const unlisten = () => {
    if (!listening) return;
    listening = false;
    removeEventListener('samey-transitionend', onEnd);
    removeEventListener('samey-document-transitionend', onEnd);
  };
  const cleanup = () => {
    unlisten();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };
  const listen = () => {
    if (listening || cancelled) return;
    listening = true;
    addEventListener('samey-transitionend', onEnd);
    addEventListener('samey-document-transitionend', onEnd);
  };
  const run = () => {
    if (cancelled) return;
    if (transitionActive()) { listen(); return; }
    unlisten();
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (cancelled) return;
      // A speculative/prerendered document can become transition-active
      // between scheduling this frame and activation. In that case do not
      // drop the callback: switch to the transition-end wait path.
      if (transitionActive()) { listen(); return; }
      unlisten();
      callback();
    });
  };
  const onEnd = () => { unlisten(); run(); };

  run();

  return () => {
    cancelled = true;
    cleanup();
  };
}
