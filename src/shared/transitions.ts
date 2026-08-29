const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

type Direction = 'forward' | 'back';

/** One motion contract for every page/view swap in the site. */
export const PAGE_TRANSITION = {
  // One timing knob for Solid routes, standalone root swaps, and mounted game views.
  duration: 210,
  leaveRatio: 0.72,
  enterEasing: 'cubic-bezier(.16,1,.3,1)',
  leaveEasing: 'cubic-bezier(.4,0,.2,1)',
  opacity: .32,
  forwardScale: .982,
  backScale: .992,
  leaveScale: 1.006,
} as const;

const leaveDuration = () => Math.round(PAGE_TRANSITION.duration * PAGE_TRANSITION.leaveRatio);

const startScale = (direction: Direction) => `scale(${direction === 'back' ? PAGE_TRANSITION.backScale : PAGE_TRANSITION.forwardScale})`;

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

  clone.scrollTop = element.scrollTop;
  clone.scrollLeft = element.scrollLeft;
  const sourceState = element.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input,textarea,select');
  const targetState = clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input,textarea,select');
  for (let i = 0; i < Math.min(sourceState.length, targetState.length); i++) {
    const source = sourceState[i], target = targetState[i];
    if (source instanceof HTMLInputElement && target instanceof HTMLInputElement) {
      target.value = source.value; target.checked = source.checked;
    } else if (source instanceof HTMLTextAreaElement && target instanceof HTMLTextAreaElement) target.value = source.value;
    else if (source instanceof HTMLSelectElement && target instanceof HTMLSelectElement) target.selectedIndex = source.selectedIndex;
  }
  const sourceCanvases = element.querySelectorAll<HTMLCanvasElement>('canvas');
  const targetCanvases = clone.querySelectorAll<HTMLCanvasElement>('canvas');
  for (let i = 0; i < Math.min(sourceCanvases.length, targetCanvases.length); i++) {
    const source = sourceCanvases[i], target = targetCanvases[i];
    target.width = source.width; target.height = source.height;
    try { target.getContext('2d')?.drawImage(source, 0, 0); } catch {}
  }
  shell.append(clone);
  document.body.append(shell);
  return shell;
}

function primeIncoming(element: HTMLElement, direction: Direction) {
  element.style.opacity = String(PAGE_TRANSITION.opacity);
  element.style.transform = startScale(direction);
}

function animateIncoming(element: HTMLElement, direction: Direction) {
  return element.animate([
    { opacity: PAGE_TRANSITION.opacity, transform: startScale(direction) },
    { opacity: 1, transform: 'scale(1)' },
  ], { duration: PAGE_TRANSITION.duration, easing: PAGE_TRANSITION.enterEasing, fill: 'both' });
}

function animateOutgoing(element: HTMLElement) {
  return element.animate([
    { opacity: 1, transform: 'scale(1)' },
    { opacity: 0, transform: `scale(${PAGE_TRANSITION.leaveScale})` },
  ], { duration: leaveDuration(), easing: PAGE_TRANSITION.leaveEasing, fill: 'both' });
}

function clearIncoming(element: HTMLElement) {
  element.style.opacity = '';
  element.style.transform = '';
  element.style.pointerEvents = '';
}

export async function animateRootSwap(current: HTMLElement | null, commit: () => void | Promise<void>, next: () => HTMLElement | null, direction: Direction = 'forward') {
  if (!current || reducedMotion() || !current.animate) { await commit(); return; }
  const snapshot = snapshotElement(current);
  try { await commit(); } catch (error) { snapshot.remove(); throw error; }

  await Promise.resolve();
  let incoming = next();
  if (!incoming || incoming === current || !incoming.isConnected) { await nextFrame(); incoming = next(); }
  if (incoming) primeIncoming(incoming, direction);

  const enter = incoming?.animate ? animateIncoming(incoming, direction) : undefined;
  const leave = animateOutgoing(snapshot);
  await Promise.allSettled([leave.finished, enter?.finished ?? Promise.resolve()]);
  snapshot.remove();
  enter?.cancel();
  if (incoming) clearIncoming(incoming);
}

export async function animateMountedViewSwap(from: HTMLElement, to: HTMLElement, commit: () => void, direction: Direction = 'forward') {
  if (reducedMotion() || !from.animate || !to.animate) { commit(); from.hidden = true; to.hidden = false; return; }
  primeIncoming(to, direction);
  to.style.pointerEvents = 'none';
  to.hidden = false;
  commit();
  const enter = animateIncoming(to, direction);
  const leave = animateOutgoing(from);
  await Promise.allSettled([enter.finished, leave.finished]);
  from.hidden = true;
  enter.cancel(); leave.cancel(); clearIncoming(to);
}
