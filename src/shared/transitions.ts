const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

type Direction = 'forward' | 'back';
type Phase = 'in' | 'out';

/** Routed/local views deconstruct into visible rules, then rebuild without moving layout. */
const CONSTRUCTED_TRANSITION = {
  line: 190,
  content: 110,
  contentGap: 18,
  stagger: 2,
  maxStagger: 48,
  contentStagger: 1.5,
  maxContentStagger: 30,
  contentFloor: 0.72,
  maxBorderCandidates: 260,
  maxContentTargets: 96,
  enterEasing: 'cubic-bezier(.16,1,.3,1)',
  leaveEasing: 'cubic-bezier(.4,0,1,1)',
} as const;

const CONSTRUCTION_LINE_SELECTOR = [
  'header', 'nav', 'main', 'section', 'article', 'aside', 'footer', 'form', 'figure', 'fieldset',
  'table', 'thead', 'tbody', 'tr', 'ul', 'ol', 'blockquote', 'pre', 'hr', 'details', 'summary',
  '[role="dialog"]', '[role="group"]', '[role="radiogroup"]', 'button', 'input', 'select', 'textarea',
  '.site-topbar', '.intro', '.grid', '.grid > *', '.compact-list', '.compact-row',
  '.project-grid', '.project', '.home-tool-matrix', '.home-tool', '.home-writing-split', '.home-writing-read',
  '.home-writing-index', '.home-writing-link', '.fact-strip', '.fact-strip > *', '.detail-copy',
  '.blog-split-index', '.blog-index-nav', '.blog-index-link', '.blog-index-detail', '.blog-detail-footer',
  '.cnn-demo-shell', '.cnn-controls-row', '.cnn-output-pane',
  '.wordle-mode-card', '.stats-section', '.stats-history-row', '.active-game-card', '.samey-dialog',
  '.chain-mode-card', '.chain-stats-grid > *', '.chain-replay-stage', '.chain-replay-controls', '.chain-result',
  '.game-settings-popover', '.game-settings-actions', '.keybr-segmented', '.keybr-segmented-item',
].join(',');

const CONSTRUCTION_CONTENT_SELECTOR = [
  'h1', 'h2', 'h3', 'h4', 'p', 'figcaption', 'legend', 'label', 'dt', 'dd', 'li', 'time', 'output',
  'small', 'strong', 'em', 'code', 'kbd', 'a',
  '.site-topbar-start > *', '.site-topbar-context > *', '.site-topbar-nav > *',
  '.intro-meta > *', '.intro-links > *', '.section-head > *', '.card-top > *', '.card-copy',
  '.compact-row > *', '.project-head > *', '.project > p', '.home-tool-index', '.home-tool-top > *',
  '.home-tool-desc', '.home-writing-link > *', '.home-writing-kicker', '.home-writing-detail time',
  '.home-writing-detail h2', '.home-writing-dek', '.home-writing-summary', '.home-writing-detail li',
  '.page-intro > *', '.project-detail > .eyebrow', '.project-detail > h1', '.project-source-link',
  '.fact-strip > *', '.project-description > *', '.blog-index-eyebrow', '.blog-index-intro h1',
  '.blog-index-intro p', '.blog-index-link > *', '.blog-detail-kicker', '.blog-detail-date',
  '.blog-index-detail h2', '.blog-detail-dek', '.blog-detail-summary', '.blog-detail-points li',
  '.blog-detail-footer > *', '.chain-mode-eyebrow', '.chain-mode-spec', '.chain-turn',
  '.chain-stats-grid > *', '.chain-stat-row', '.game-settings-section-title',
  '.game-settings-slider-head', '.keybr-segmented-item',
].join(',');

const SVG_NS = 'http://www.w3.org/2000/svg';
const BORDER_HIDE_ATTR = {
  top: 'data-samey-construction-hide-top',
  right: 'data-samey-construction-hide-right',
  bottom: 'data-samey-construction-hide-bottom',
  left: 'data-samey-construction-hide-left',
} as const;

type BorderSide = keyof typeof BORDER_HIDE_ATTR;
type Radius = { x: number; y: number };
type ConstructionLayer = {
  layer: HTMLElement;
  hiddenBorders: Map<HTMLElement, Set<string>>;
};
type ConstructionRun = ConstructionLayer & { animations: Animation[] };

const stagger = (index: number) => Math.min(index * CONSTRUCTED_TRANSITION.stagger, CONSTRUCTED_TRANSITION.maxStagger);
const contentStagger = (index: number) => Math.min(index * CONSTRUCTED_TRANSITION.contentStagger, CONSTRUCTED_TRANSITION.maxContentStagger);
const animationFinished = (animation: Animation) => animation.finished.catch(() => undefined);
const waitAnimations = (animations: Animation[]) => Promise.all(animations.map(animationFinished));

function inViewport(rect: DOMRect) {
  return rect.width > 0 && rect.height > 0 && rect.right > -2 && rect.bottom > -2 && rect.left < innerWidth + 2 && rect.top < innerHeight + 2;
}

function opaqueBorder(color: string, width: string) {
  if (!(parseFloat(width) > 0) || color === 'transparent') return false;
  return !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(color);
}

function radiusComponent(value: string, dimension: number) {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  return value.trim().endsWith('%') ? dimension * parsed / 100 : parsed;
}

function parseRadius(value: string, width: number, height: number): Radius {
  const [x = '0', y = x] = value.trim().split(/\s+/);
  return { x: radiusComponent(x, width), y: radiusComponent(y, height) };
}

function roundedRectPaths(rect: DOMRect, borderWidth: number, style: CSSStyleDeclaration) {
  const inset = borderWidth / 2;
  const x = rect.left + inset;
  const y = rect.top + inset;
  const width = Math.max(0, rect.width - borderWidth);
  const height = Math.max(0, rect.height - borderWidth);
  const radii = [
    parseRadius(style.borderTopLeftRadius, rect.width, rect.height),
    parseRadius(style.borderTopRightRadius, rect.width, rect.height),
    parseRadius(style.borderBottomRightRadius, rect.width, rect.height),
    parseRadius(style.borderBottomLeftRadius, rect.width, rect.height),
  ].map(radius => ({
    x: Math.min(width / 2, Math.max(0, radius.x - inset)),
    y: Math.min(height / 2, Math.max(0, radius.y - inset)),
  }));
  const [tl, tr, br, bl] = radii;
  const right = x + width;
  const bottom = y + height;
  const arc = (radius: Radius, endX: number, endY: number) =>
    radius.x > 0 && radius.y > 0
      ? 'A' + radius.x + ',' + radius.y + ' 0 0 1 ' + endX + ',' + endY
      : 'L' + endX + ',' + endY;
  return {
    paths: {
      top: 'M' + (x + tl.x) + ',' + y
        + 'L' + (right - tr.x) + ',' + y
        + arc(tr, right, y + tr.y),
      right: 'M' + right + ',' + (y + tr.y)
        + 'L' + right + ',' + (bottom - br.y)
        + arc(br, right - br.x, bottom),
      bottom: 'M' + (right - br.x) + ',' + bottom
        + 'L' + (x + bl.x) + ',' + bottom
        + arc(bl, x, bottom - bl.y),
      left: 'M' + x + ',' + (bottom - bl.y)
        + 'L' + x + ',' + (y + tl.y)
        + arc(tl, x + tl.x, y),
    } satisfies Record<BorderSide, string>,
    rounded: radii.some(radius => radius.x > 0 || radius.y > 0),
  };
}

function constructionCandidates(root: HTMLElement) {
  const selected: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();
  const add = (element: HTMLElement) => {
    if (seen.has(element) || selected.length >= CONSTRUCTED_TRANSITION.maxBorderCandidates) return;
    seen.add(element);
    if (element === root || element.getClientRects().length > 0) selected.push(element);
  };
  add(root);
  root.querySelectorAll<HTMLElement>(CONSTRUCTION_LINE_SELECTOR).forEach(add);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  while (selected.length < CONSTRUCTED_TRANSITION.maxBorderCandidates) {
    const node = walker.nextNode();
    if (!node) break;
    if (node instanceof HTMLElement) add(node);
  }
  return selected;
}

function makeConstructionLayer(root: HTMLElement): ConstructionLayer {
  const layer = document.createElement('div');
  layer.className = 'samey-construction-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.inert = true;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('samey-construction-svg');
  svg.setAttribute('viewBox', ['0', '0', String(innerWidth), String(innerHeight)].join(' '));
  svg.setAttribute('preserveAspectRatio', 'none');
  layer.append(svg);
  const seen = new Set<string>();
  const hiddenBorders = new Map<HTMLElement, Set<string>>();
  const candidates = constructionCandidates(root);

  const addStroke = (key: string, pathData: string, thickness: number, color: string, rounded = false) => {
    if (seen.has(key)) return true;
    if (!(thickness > 0) || !pathData) return false;
    seen.add(key);
    const stroke = document.createElementNS(SVG_NS, 'path');
    stroke.classList.add('samey-construction-stroke');
    stroke.dataset.rounded = rounded ? 'true' : 'false';
    stroke.setAttribute('d', pathData);
    stroke.setAttribute('fill', 'none');
    stroke.setAttribute('stroke', color);
    stroke.setAttribute('stroke-width', String(thickness));
    stroke.setAttribute('stroke-linejoin', 'round');
    stroke.setAttribute('stroke-linecap', 'butt');
    stroke.setAttribute('pathLength', '1');
    stroke.setAttribute('stroke-dasharray', '1');
    svg.append(stroke);
    return true;
  };
  const hide = (element: HTMLElement, sides: BorderSide[], rounded = false) => {
    let attrs = hiddenBorders.get(element);
    if (!attrs) {
      attrs = new Set<string>();
      hiddenBorders.set(element, attrs);
      element.setAttribute('data-samey-construction-source', '');
    }
    if (rounded) {
      element.setAttribute('data-samey-construction-rounded', '');
      attrs.add('data-samey-construction-rounded');
    }
    for (const side of sides) {
      const attr = BORDER_HIDE_ATTR[side];
      element.setAttribute(attr, '');
      attrs.add(attr);
    }
  };

  for (const element of candidates) {
    const rect = element.getBoundingClientRect();
    if (!inViewport(rect)) continue;
    const style = getComputedStyle(element);
    const sides = {
      top: { color: style.borderTopColor, width: parseFloat(style.borderTopWidth) },
      right: { color: style.borderRightColor, width: parseFloat(style.borderRightWidth) },
      bottom: { color: style.borderBottomColor, width: parseFloat(style.borderBottomWidth) },
      left: { color: style.borderLeftColor, width: parseFloat(style.borderLeftWidth) },
    } as const;
    const visible = (Object.keys(sides) as BorderSide[]).filter(side =>
      opaqueBorder(sides[side].color, String(sides[side].width)));
    if (visible.length === 0) continue;
    const first = sides[visible[0]];
    const uniformBox = visible.length === 4 && visible.every(side =>
      sides[side].color === first.color && Math.abs(sides[side].width - first.width) < 0.01);
    if (uniformBox) {
      const rounded = roundedRectPaths(rect, first.width, style);
      for (const side of visible) {
        const key = [
          'box-side',
          side,
          Math.round(rect.left * 2),
          Math.round(rect.top * 2),
          Math.round(rect.width * 2),
          Math.round(rect.height * 2),
          first.width,
          first.color,
          rounded.paths[side],
        ].join(':');
        addStroke(key, rounded.paths[side], first.width, first.color, rounded.rounded);
      }
      hide(element, visible, rounded.rounded);
      continue;
    }

    const tl = parseRadius(style.borderTopLeftRadius, rect.width, rect.height);
    const tr = parseRadius(style.borderTopRightRadius, rect.width, rect.height);
    const br = parseRadius(style.borderBottomRightRadius, rect.width, rect.height);
    const bl = parseRadius(style.borderBottomLeftRadius, rect.width, rect.height);
    const paths: Record<BorderSide, string> = {
      top: 'M' + (rect.left + tl.x) + ',' + (rect.top + sides.top.width / 2)
        + 'L' + (rect.right - tr.x) + ',' + (rect.top + sides.top.width / 2),
      right: 'M' + (rect.right - sides.right.width / 2) + ',' + (rect.top + tr.y)
        + 'L' + (rect.right - sides.right.width / 2) + ',' + (rect.bottom - br.y),
      bottom: 'M' + (rect.left + bl.x) + ',' + (rect.bottom - sides.bottom.width / 2)
        + 'L' + (rect.right - br.x) + ',' + (rect.bottom - sides.bottom.width / 2),
      left: 'M' + (rect.left + sides.left.width / 2) + ',' + (rect.top + tl.y)
        + 'L' + (rect.left + sides.left.width / 2) + ',' + (rect.bottom - bl.y),
    };
    for (const side of visible) {
      const key = [side, paths[side], sides[side].width, sides[side].color].join(':');
      if (addStroke(key, paths[side], sides[side].width, sides[side].color))
        hide(element, [side]);
    }
  }

  document.body.append(layer);
  return { layer, hiddenBorders };
}

function animateConstructionLines(construction: ConstructionLayer, phase: Phase, direction: Direction) {
  return [...construction.layer.querySelectorAll<SVGGeometryElement>('.samey-construction-stroke')].map((stroke, index) => {
    const entering = phase === 'in';
    const hidden = direction === 'forward' ? '1' : '-1';
    return stroke.animate(
      entering
        ? [{ strokeDashoffset: hidden, opacity: 0.42 }, { strokeDashoffset: '0', opacity: 1 }]
        : [{ strokeDashoffset: '0', opacity: 1 }, { strokeDashoffset: hidden, opacity: 0.42 }],
      {
        duration: CONSTRUCTED_TRANSITION.line,
        delay: stagger(index),
        easing: entering ? CONSTRUCTED_TRANSITION.enterEasing : CONSTRUCTED_TRANSITION.leaveEasing,
        fill: 'both',
      },
    );
  });
}

function contentTargets(root: HTMLElement) {
  const candidates = [...root.querySelectorAll<HTMLElement>(CONSTRUCTION_CONTENT_SELECTOR)]
    .filter(element => inViewport(element.getBoundingClientRect()));
  const selected = new Set(candidates);
  return candidates.filter(element => {
    let ancestor = element.parentElement;
    while (ancestor && ancestor !== root) {
      if (selected.has(ancestor)) return false;
      ancestor = ancestor.parentElement;
    }
    return true;
  }).slice(0, CONSTRUCTED_TRANSITION.maxContentTargets);
}

function animateConstructionContent(root: HTMLElement, phase: Phase) {
  const entering = phase === 'in';
  return contentTargets(root).map((element, index) => {
    const parsedOpacity = Number.parseFloat(getComputedStyle(element).opacity);
    const baseline = Number.isFinite(parsedOpacity) ? parsedOpacity : 1;
    const faded = Math.max(0, baseline * CONSTRUCTED_TRANSITION.contentFloor);
    element.setAttribute('data-samey-construction-content', '');
    const animation = element.animate(
      entering ? [{ opacity: faded }, { opacity: baseline }] : [{ opacity: baseline }, { opacity: faded }],
      {
        duration: CONSTRUCTED_TRANSITION.content,
        delay: (entering ? CONSTRUCTED_TRANSITION.contentGap : 0) + contentStagger(index),
        easing: entering ? CONSTRUCTED_TRANSITION.enterEasing : CONSTRUCTED_TRANSITION.leaveEasing,
        fill: 'both',
      },
    );
    void animation.finished
      .catch(() => undefined)
      .finally(() => element.removeAttribute('data-samey-construction-content'));
    return animation;
  });
}

function restoreConstructionSources(construction: ConstructionLayer) {
  for (const [element, attrs] of construction.hiddenBorders) {
    for (const attr of attrs) element.removeAttribute(attr);
    element.removeAttribute('data-samey-construction-source');
  }
}

async function animateConstructionExit(root: HTMLElement, direction: Direction) {
  const construction = makeConstructionLayer(root);
  const animations = [
    ...animateConstructionLines(construction, 'out', direction),
    ...animateConstructionContent(root, 'out'),
  ];
  await waitAnimations(animations);
  return { ...construction, animations };
}

async function animateConstructionEntrance(root: HTMLElement, direction: Direction) {
  const construction = makeConstructionLayer(root);
  const animations = [
    ...animateConstructionLines(construction, 'in', direction),
    ...animateConstructionContent(root, 'in'),
  ];
  await waitAnimations(animations);
  restoreConstructionSources(construction);
  for (const animation of animations) animation.cancel();
  construction.layer.remove();
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

function cleanupConstruction(run: ConstructionRun) {
  restoreConstructionSources(run);
  run.layer.remove();
  for (const animation of run.animations) animation.cancel();
}

export async function animateRootSwap(
  current: HTMLElement | null,
  commit: () => void | Promise<void>,
  next: () => HTMLElement | null,
  direction: Direction = 'forward',
) {
  if (!current || reducedMotion() || !current.animate) { await commit(); return; }

  const outgoing = await animateConstructionExit(current, direction);
  try {
    await commit();
  } catch (error) {
    cleanupConstruction(outgoing);
    throw error;
  }
  cleanupConstruction(outgoing);

  const incoming = await resolveIncoming(next, current);
  if (incoming?.isConnected) await animateConstructionEntrance(incoming, direction);
}

export async function animateMountedViewSwap(from: HTMLElement, to: HTMLElement, commit: () => void, direction: Direction = 'forward') {
  if (reducedMotion() || !from.animate || !to.animate) { commit(); from.hidden = true; to.hidden = false; return; }
  const outgoing = await animateConstructionExit(from, direction);
  from.hidden = true;
  cleanupConstruction(outgoing);
  to.hidden = false;
  to.style.pointerEvents = 'none';
  commit();
  await nextFrame();
  await animateConstructionEntrance(to, direction);
  to.style.pointerEvents = '';
}
