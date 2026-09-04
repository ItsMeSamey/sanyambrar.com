const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

type Direction = 'forward' | 'back';
type Phase = 'in' | 'out';

/** Compatibility timing retained for callers that inspect the shared contract. */
export const PAGE_TRANSITION = {
  duration: 210,
  leaveRatio: 0.72,
  enterEasing: 'cubic-bezier(.16,1,.3,1)',
  leaveEasing: 'cubic-bezier(.4,0,.2,1)',
  opacity: .32,
  forwardScale: .982,
  backScale: .992,
  leaveScale: 1.006,
} as const;

/** Every routed and local view deconstructs into rules, then rebuilds before content. */
const CONSTRUCTED_TRANSITION = {
  out: 260,
  in: 420,
  line: 190,
  content: 150,
  groupGap: 90,
  stagger: 3,
  maxStagger: 70,
  offset: 5,
  enterEasing: 'cubic-bezier(.16,1,.3,1)',
  leaveEasing: 'cubic-bezier(.4,0,1,1)',
} as const;

const CONSTRUCTION_LINE_SELECTOR = [
  'header', 'nav', 'main', 'section', 'article', 'figure', 'fieldset', 'table', 'thead', 'tbody', 'tr',
  '[role="dialog"]', '[role="group"]', '[role="radiogroup"]', 'button', 'input', 'select', 'textarea',
  '.site-topbar', '.intro', '.grid', '.grid > *', '.compact-list', '.compact-row',
  '.project-grid', '.project', '.home-tool-matrix', '.home-tool', '.home-writing-split',
  '.home-writing-index', '.home-writing-link', '.fact-strip', '.fact-strip > *', '.detail-copy',
  '.blog-split-index', '.blog-index-nav', '.blog-index-link', '.blog-index-detail', '.blog-detail-footer',
  '.cnn-demo-shell', '.cnn-controls-row', '.cnn-output-pane',
  '.wordle-mode-card', '.stats-section', '.stats-history-row', '.active-game-card', '.samey-dialog',
  '.chain-mode-card', '.chain-stats-grid > *', '.chain-replay-stage', '.chain-replay-controls', '.chain-result',
  '.game-settings-popover', '.game-settings-actions', '.keybr-segmented', '.keybr-segmented-item',
].join(',');

const CONSTRUCTION_CONTENT_SELECTOR = [
  'h1', 'h2', 'h3', 'p', 'figcaption', 'legend', 'label', 'dt', 'dd', 'li', 'time', 'output',
  'button', 'a', 'input', 'select', 'textarea', 'canvas', '[role="status"]', '[role="grid"]',
  '.site-topbar-start > *', '.site-topbar-context > *', '.site-topbar-nav > *',
  '.intro-meta > *', '.intro-links > *', '.section-head > *', '.card-top > *', '.card-copy',
  '.compact-row > *', '.project-head > *', '.project > p', '.home-tool-index', '.home-tool-top > *',
  '.home-tool-desc', '.home-writing-link > *', '.home-writing-kicker', '.home-writing-detail time',
  '.home-writing-detail h2', '.home-writing-dek', '.home-writing-summary', '.home-writing-detail li',
  '.home-writing-detail footer > *', '.page-intro > *', '.project-detail > .eyebrow',
  '.project-detail > h1', '.project-source-link', '.fact-strip > *', '.project-description > *',
  '.blog-index-eyebrow', '.blog-index-intro h1', '.blog-index-intro p', '.blog-index-link > *',
  '.blog-detail-kicker', '.blog-detail-date', '.blog-index-detail h2', '.blog-detail-dek',
  '.blog-detail-summary', '.blog-detail-points li', '.blog-detail-footer > *',
  '.chain-mode-eyebrow', '.chain-mode-spec', '.chain-turn', '.chain-stats-grid > *', '.chain-stat-row',
  '.game-settings-section-title', '.game-settings-slider-head', '.keybr-segmented-item',
].join(',');

const leaveDuration = () => Math.round(PAGE_TRANSITION.duration * PAGE_TRANSITION.leaveRatio);
const startScale = (direction: Direction) => `scale(${direction === 'back' ? PAGE_TRANSITION.backScale : PAGE_TRANSITION.forwardScale})`;
const stagger = (index: number) => Math.min(index * CONSTRUCTED_TRANSITION.stagger, CONSTRUCTED_TRANSITION.maxStagger);
const animationFinished = (animation: Animation) => animation.finished.catch(() => undefined);
const waitAnimations = (animations: Animation[]) => Promise.all(animations.map(animationFinished));

function constructionRoot(element: HTMLElement | null): HTMLElement | null {
  return element?.isConnected ? element : null;
}

function inViewport(rect: DOMRect) {
  return rect.width > 0 && rect.height > 0 && rect.right > -2 && rect.bottom > -2 && rect.left < innerWidth + 2 && rect.top < innerHeight + 2;
}

function opaqueBorder(color: string, width: string) {
  if (!(parseFloat(width) > 0) || color === 'transparent') return false;
  return !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(color);
}

function makeConstructionLayer(root: HTMLElement) {
  const layer = document.createElement('div');
  layer.className = 'samey-construction-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.inert = true;
  const seen = new Set<string>();
  const candidates = [root, ...root.querySelectorAll<HTMLElement>(CONSTRUCTION_LINE_SELECTOR)];

  const add = (axis: 'x' | 'y', x: number, y: number, size: number, thickness: number, color: string) => {
    const start = axis === 'x' ? x : y;
    const key = `${axis}:${Math.round(start * 2)}:${Math.round((axis === 'x' ? y : x) * 2)}:${Math.round(size * 2)}:${color}`;
    if (size < 2 || seen.has(key)) return;
    seen.add(key);
    const line = document.createElement('i');
    line.className = 'samey-construction-line';
    line.dataset.axis = axis;
    line.style.left = `${x}px`;
    line.style.top = `${y}px`;
    line.style.width = axis === 'x' ? `${size}px` : `${Math.max(1, thickness)}px`;
    line.style.height = axis === 'y' ? `${size}px` : `${Math.max(1, thickness)}px`;
    line.style.backgroundColor = color;
    layer.append(line);
  };

  for (const element of candidates) {
    const rect = element.getBoundingClientRect();
    if (!inViewport(rect)) continue;
    const style = getComputedStyle(element);
    const left = Math.max(0, rect.left);
    const right = Math.min(innerWidth, rect.right);
    const top = Math.max(0, rect.top);
    const bottom = Math.min(innerHeight, rect.bottom);
    if (opaqueBorder(style.borderTopColor, style.borderTopWidth) && rect.top >= 0 && rect.top <= innerHeight)
      add('x', left, rect.top, right - left, parseFloat(style.borderTopWidth), style.borderTopColor);
    if (opaqueBorder(style.borderBottomColor, style.borderBottomWidth) && rect.bottom >= 0 && rect.bottom <= innerHeight)
      add('x', left, rect.bottom - parseFloat(style.borderBottomWidth), right - left, parseFloat(style.borderBottomWidth), style.borderBottomColor);
    if (opaqueBorder(style.borderLeftColor, style.borderLeftWidth) && rect.left >= 0 && rect.left <= innerWidth)
      add('y', rect.left, top, bottom - top, parseFloat(style.borderLeftWidth), style.borderLeftColor);
    if (opaqueBorder(style.borderRightColor, style.borderRightWidth) && rect.right >= 0 && rect.right <= innerWidth)
      add('y', rect.right - parseFloat(style.borderRightWidth), top, bottom - top, parseFloat(style.borderRightWidth), style.borderRightColor);
  }

  document.body.append(layer);
  return layer;
}

function animateConstructionLines(layer: HTMLElement, phase: Phase, direction: Direction) {
  return [...layer.children].map((child, index) => {
    const line = child as HTMLElement;
    const horizontal = line.dataset.axis === 'x';
    const entering = phase === 'in';
    const forward = direction === 'forward';
    line.style.transformOrigin = horizontal
      ? (entering === forward ? 'left center' : 'right center')
      : (entering === forward ? 'center top' : 'center bottom');
    const hidden = horizontal ? 'scaleX(0)' : 'scaleY(0)';
    return line.animate(
      entering ? [{ transform: hidden }, { transform: 'scale(1)' }] : [{ transform: 'scale(1)' }, { transform: hidden }],
      { duration: CONSTRUCTED_TRANSITION.line, delay: stagger(index), easing: entering ? CONSTRUCTED_TRANSITION.enterEasing : CONSTRUCTED_TRANSITION.leaveEasing, fill: 'both' },
    );
  });
}

function contentTargets(root: HTMLElement) {
  const candidates = [...root.querySelectorAll<HTMLElement>(CONSTRUCTION_CONTENT_SELECTOR)]
    .filter(element => inViewport(element.getBoundingClientRect()));
  const selected = new Set(candidates);
  return candidates.filter(element => {
    const interactiveAncestor = element.parentElement?.closest<HTMLElement>('button,a');
    return interactiveAncestor == null || !selected.has(interactiveAncestor);
  });
}

function animateConstructionContent(root: HTMLElement, phase: Phase, direction: Direction) {
  const entering = phase === 'in';
  const sign = direction === 'forward' ? 1 : -1;
  return contentTargets(root).map((element, index) => {
    const baseTransform = getComputedStyle(element).transform;
    const baseline = baseTransform === 'none' ? 'none' : baseTransform;
    const shifted = `${baseTransform === 'none' ? '' : `${baseTransform} `}translate3d(0,${(entering ? sign : -sign) * CONSTRUCTED_TRANSITION.offset}px,0)`;
    return element.animate(
      entering
        ? [{ opacity: 0, transform: shifted }, { opacity: 1, transform: baseline }]
        : [{ opacity: 1, transform: baseline }, { opacity: 0, transform: shifted }],
      {
        duration: CONSTRUCTED_TRANSITION.content,
        delay: (entering ? CONSTRUCTED_TRANSITION.groupGap : 0) + stagger(index),
        easing: entering ? CONSTRUCTED_TRANSITION.enterEasing : CONSTRUCTED_TRANSITION.leaveEasing,
        fill: 'both',
      },
    );
  });
}

async function animateConstructionExit(root: HTMLElement, direction: Direction) {
  const layer = makeConstructionLayer(root);
  const animations = [
    root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CONSTRUCTED_TRANSITION.out, easing: CONSTRUCTED_TRANSITION.leaveEasing, fill: 'both' }),
    ...animateConstructionLines(layer, 'out', direction),
    ...animateConstructionContent(root, 'out', direction),
  ];
  await waitAnimations(animations);
  return { layer, animations };
}

async function animateConstructionEntrance(root: HTMLElement, direction: Direction) {
  const priorOpacity = root.style.opacity;
  root.style.opacity = '0';
  const layer = makeConstructionLayer(root);
  const animations = [
    root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CONSTRUCTED_TRANSITION.in, easing: CONSTRUCTED_TRANSITION.enterEasing, fill: 'both' }),
    ...animateConstructionLines(layer, 'in', direction),
    ...animateConstructionContent(root, 'in', direction),
  ];
  root.style.opacity = priorOpacity;
  await waitAnimations(animations);
  for (const animation of animations) animation.cancel();
  layer.remove();
}

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

async function resolveIncoming(next: () => HTMLElement | null, current: HTMLElement | null) {
  await Promise.resolve();
  let incoming = next();
  if (!incoming || incoming === current || !incoming.isConnected) {
    await nextFrame();
    incoming = next();
  }
  return incoming;
}

export async function animateRootSwap(current: HTMLElement | null, commit: () => void | Promise<void>, next: () => HTMLElement | null, direction: Direction = 'forward') {
  if (!current || reducedMotion() || !current.animate) { await commit(); return; }

  const constructedCurrent = constructionRoot(current);
  if (constructedCurrent) {
    const outgoing = await animateConstructionExit(constructedCurrent, direction);
    try {
      await commit();
    } catch (error) {
      outgoing.layer.remove();
      for (const animation of outgoing.animations) animation.cancel();
      throw error;
    }
    outgoing.layer.remove();
    for (const animation of outgoing.animations) animation.cancel();
    const incoming = await resolveIncoming(next, current);
    const constructedIncoming = constructionRoot(incoming);
    if (constructedIncoming) await animateConstructionEntrance(constructedIncoming, direction);
    else if (incoming?.animate) {
      primeIncoming(incoming, direction);
      const enter = animateIncoming(incoming, direction);
      await animationFinished(enter);
      enter.cancel();
      clearIncoming(incoming);
    }
    return;
  }

  const snapshot = snapshotElement(current);
  try { await commit(); } catch (error) { snapshot.remove(); throw error; }
  const incoming = await resolveIncoming(next, current);
  const constructedIncoming = constructionRoot(incoming);
  const leave = animateOutgoing(snapshot);
  if (constructedIncoming) {
    await Promise.all([animationFinished(leave), animateConstructionEntrance(constructedIncoming, direction)]);
    snapshot.remove();
    return;
  }
  if (incoming) primeIncoming(incoming, direction);
  const enter = incoming?.animate ? animateIncoming(incoming, direction) : undefined;
  await Promise.all([animationFinished(leave), enter ? animationFinished(enter) : Promise.resolve()]);
  snapshot.remove();
  enter?.cancel();
  if (incoming) clearIncoming(incoming);
}

export async function animateMountedViewSwap(from: HTMLElement, to: HTMLElement, commit: () => void, direction: Direction = 'forward') {
  if (reducedMotion() || !from.animate || !to.animate) { commit(); from.hidden = true; to.hidden = false; return; }
  const outgoing = await animateConstructionExit(from, direction);
  from.hidden = true;
  outgoing.layer.remove();
  for (const animation of outgoing.animations) animation.cancel();
  to.hidden = false;
  to.style.pointerEvents = 'none';
  commit();
  await nextFrame();
  await animateConstructionEntrance(to, direction);
  to.style.pointerEvents = '';
}
