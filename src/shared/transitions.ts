const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const twoFrames = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

type Direction = 'forward' | 'back';

function snapshotElement(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const shell = document.createElement('div');
  shell.className = 'samey-route-snapshot';
  shell.setAttribute('aria-hidden', 'true');
  shell.inert = true;
  shell.style.setProperty('--snapshot-top', `${rect.top}px`);
  shell.style.setProperty('--snapshot-left', `${rect.left}px`);
  shell.style.setProperty('--snapshot-width', `${rect.width}px`);
  shell.style.setProperty('--snapshot-height', `${rect.height}px`);
  const clone = element.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.querySelectorAll<HTMLElement>('[id]').forEach(node => node.removeAttribute('id'));
  clone.querySelectorAll<HTMLElement>('[aria-controls],[aria-labelledby],[aria-describedby]').forEach(node => {
    node.removeAttribute('aria-controls');
    node.removeAttribute('aria-labelledby');
    node.removeAttribute('aria-describedby');
  });

  // cloneNode() does not preserve live form state, scroll positions, or canvas
  // pixels. Copy them so transitions never flash stale/blank content.
  const originals = [element, ...element.querySelectorAll<HTMLElement>('*')];
  const copies = [clone, ...clone.querySelectorAll<HTMLElement>('*')];
  for (let index = 0; index < Math.min(originals.length, copies.length); index++) {
    const source = originals[index];
    const target = copies[index];
    target.scrollTop = source.scrollTop;
    target.scrollLeft = source.scrollLeft;
    if (source instanceof HTMLInputElement && target instanceof HTMLInputElement) {
      target.value = source.value; target.checked = source.checked;
    } else if (source instanceof HTMLTextAreaElement && target instanceof HTMLTextAreaElement) target.value = source.value;
    else if (source instanceof HTMLSelectElement && target instanceof HTMLSelectElement) target.selectedIndex = source.selectedIndex;
    else if (source instanceof HTMLCanvasElement && target instanceof HTMLCanvasElement) {
      target.width = source.width; target.height = source.height;
      try { target.getContext('2d')?.drawImage(source, 0, 0) } catch {}
    }
  }
  shell.append(clone);
  document.body.append(shell);
  return shell;
}

export async function animateRootSwap(current: HTMLElement | null, commit: () => void | Promise<void>, next: () => HTMLElement | null, direction: Direction = 'forward') {
  if (!current || reducedMotion() || !current.animate) {
    await commit();
    return;
  }
  const snapshot = snapshotElement(current);
  try {
    await commit();
  } catch (error) {
    snapshot.remove();
    throw error;
  }
  // Solid and the standalone app loaders can commit DOM work in a microtask.
  // Querying immediately can return the outgoing node, which makes the route
  // appear to have no transition at all. Give the renderer one microtask and
  // one frame to expose the new root before starting the enter animation.
  await Promise.resolve();
  let incoming = next();
  if (!incoming || incoming === current || !incoming.isConnected) {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    incoming = next();
  }
  const fromClip = direction === 'back' ? 'inset(3% 3% round 10px)' : 'inset(5% 5% round 12px)';
  const fromScale = direction === 'back' ? 'scale(.985)' : 'scale(.955)';
  // Apply the first frame before yielding to rAF. Otherwise the newly mounted
  // root can paint once at full opacity, which reads as a white/dark flash.
  if (incoming) {
    incoming.style.opacity = '0.18';
    incoming.style.transform = fromScale;
    incoming.style.clipPath = fromClip;
  }
  await twoFrames();
  const incomingAnimation = incoming?.animate?.(
    [
      { opacity: 0.18, transform: fromScale, clipPath: fromClip },
      { opacity: 1, transform: 'scale(1)', clipPath: 'inset(0 round 0)' },
    ],
    { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' },
  );
  const outgoingAnimation = snapshot.animate(
    [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: direction === 'back' ? 'scale(1.018)' : 'scale(1.025)' },
    ],
    { duration: 190, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' },
  );
  await Promise.allSettled([outgoingAnimation.finished, incomingAnimation?.finished ?? Promise.resolve()]);
  snapshot.remove();
  incomingAnimation?.cancel();
  if (incoming) { incoming.style.opacity = ''; incoming.style.transform = ''; incoming.style.clipPath = ''; }
}

export async function animateMountedViewSwap(from: HTMLElement, to: HTMLElement, commit: () => void, direction: Direction = 'forward') {
  if (reducedMotion() || !from.animate || !to.animate) {
    commit();
    from.hidden = true;
    to.hidden = false;
    return;
  }
  const startTransform = direction === 'back' ? 'scale(.985)' : 'scale(.955)';
  const startClip = 'inset(4% 4% round 12px)';
  // Prime the incoming view before it becomes paintable. Relying on the first
  // Web Animations keyframe alone can expose one full-opacity frame on fast
  // compositors, which is the transition flash seen on game/menu swaps.
  to.style.opacity = '0.15';
  to.style.transform = startTransform;
  to.style.clipPath = startClip;
  to.style.pointerEvents = 'none';
  to.hidden = false;
  commit();
  const enter = to.animate(
    [
      { opacity: 0.15, transform: startTransform, clipPath: startClip },
      { opacity: 1, transform: 'scale(1)', clipPath: 'inset(0 round 0)' },
    ],
    { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' },
  );
  const leave = from.animate(
    [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.02)' }],
    { duration: 180, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' },
  );
  await Promise.allSettled([enter.finished, leave.finished]);
  from.hidden = true;
  enter.cancel();
  leave.cancel();
  to.style.opacity = '';
  to.style.transform = '';
  to.style.clipPath = '';
  to.style.pointerEvents = '';
}
