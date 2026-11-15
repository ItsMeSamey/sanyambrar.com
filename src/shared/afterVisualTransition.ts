const transitionActive = () =>
  document.documentElement.hasAttribute('data-samey-route-transition')
  || document.documentElement.hasAttribute('data-samey-document-transition');
const ordinaryHiddenDocument = () =>
  document.hidden && !(document as Document & { prerendering?: boolean }).prerendering;

export function afterVisualTransition(callback: () => void): () => void {
  let cancelled = false;
  let completed = false;
  let frame = 0;
  let listening = false;
  let microtaskPending = false;

  const unlisten = () => {
    if (!listening) return;
    listening = false;
    removeEventListener('samey-transitionend', onEnd);
    removeEventListener('samey-document-transitionend', onEnd);
  };
  const cleanup = () => {
    unlisten();
    document.removeEventListener('visibilitychange', run);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };
  const finish = () => {
    if (cancelled || completed) return;
    completed = true;
    cleanup();
    callback();
  };
  const listen = () => {
    if (listening || cancelled) return;
    listening = true;
    addEventListener('samey-transitionend', onEnd);
    addEventListener('samey-document-transitionend', onEnd);
  };
  const run = () => {
    if (cancelled || completed) return;
    if (transitionActive()) { listen(); return; }
    unlisten();
    // Ordinary background tabs may never receive a frame. Initialize them
    // offscreen, but keep prerender activation and transition snapshots gated.
    if (ordinaryHiddenDocument()) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (microtaskPending) return;
      microtaskPending = true;
      queueMicrotask(() => {
        microtaskPending = false;
        if (cancelled || completed) return;
        if (transitionActive() || !ordinaryHiddenDocument()) { run(); return; }
        finish();
      });
      return;
    }
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (cancelled || completed) return;
      // A speculative/prerendered document can become transition-active
      // between scheduling this frame and activation. In that case do not
      // drop the callback: switch to the transition-end wait path.
      if (transitionActive()) { listen(); return; }
      finish();
    });
  };
  const onEnd = () => { unlisten(); run(); };

  document.addEventListener('visibilitychange', run);
  run();

  return () => {
    cancelled = true;
    cleanup();
  };
}
