export type ReverbSilencePoint = { hz: number; db: number };

type Options = { onChange(points: ReverbSilencePoint[], selected: number): void };
type Plot = { left: number; top: number; right: number; bottom: number };
type Metrics = { ascent: number; height: number; width(text: string): number };
type Drag = {
  pointer: number;
  original: ReverbSilencePoint[];
  previousSelection: number;
  index: number;
  x: number;
  y: number;
  moved: boolean;
  plot: Plot;
  viewport: { left: number; top: number; width: number; height: number };
};

const FREQUENCIES = [20, 40, 80, 160, 315, 630, 1250, 2500, 5000, 10000, 20000];
const GRID_DB = [0, -24, -48, -72, -96];
const GRID_HZ = [20, 100, 1000, 10000, 20000];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const fraction = (hz: number) => clamp(Math.log10(clamp(hz, 20, 20000) / 20) / 3, 0, 1);
const frequencyAt = (value: number) => clamp(Math.round(20 * 10 ** (3 * clamp(value, 0, 1))), 20, 20000);
const copyPoints = (points: ReverbSilencePoint[]) => points.map(point => ({ ...point }));
const samePoints = (left: ReverbSilencePoint[], right: ReverbSilencePoint[]) => left.length === right.length
  && left.every((point, index) => point.hz === right[index]?.hz && point.db === right[index]?.db);
const xAt = (plot: Plot, hz: number) => plot.left + fraction(hz) * (plot.right - plot.left);
const yAt = (plot: Plot, db: number) => plot.top + clamp(-db / 96, 0, 1) * (plot.bottom - plot.top);

export const defaultReverbSilencePoints = (): ReverbSilencePoint[] =>
  [20, 200, 2000, 20000].map(hz => ({ hz, db: -50 }));

export const uncalibratedReverbSilencePoints = (): ReverbSilencePoint[] =>
  FREQUENCIES.map(hz => ({ hz, db: 0 }));

/** The same neighboring-bin envelope used by sampledSilenceCurve in the Android app. */
export function sampledReverbSilencePoints(peaks: number[], fit: number, maximumHz = 20000): ReverbSilencePoint[] {
  if (peaks.length !== 96 || peaks.some(value => !Number.isFinite(value))) {
    throw new Error('A Reverb calibration spectrum must contain 96 finite levels');
  }
  const clearance = clamp(fit, -6, 18);
  const limit = clamp(maximumHz, 20, 20000);
  return FREQUENCIES.map((hz, index) => {
    const low = FREQUENCIES[Math.max(0, index - 1)] ?? 20;
    const high = FREQUENCIES[Math.min(FREQUENCIES.length - 1, index + 1)] ?? 20000;
    const first = Math.floor(fraction(low) * (peaks.length - 1));
    const last = Math.ceil(fraction(Math.min(high, limit)) * (peaks.length - 1));
    const measured = low > limit || first > last ? -56 : Math.max(...peaks.slice(first, last + 1));
    return { hz, db: clamp(Math.round(measured + clearance), -96, -6) };
  });
}

/** Port of SilenceCurveEditor.kt: dp geometry, logarithmic axis and committed drag previews. */
export function installReverbSilenceCurve(host: HTMLElement, options: Options) {
  const document = host.ownerDocument;
  const window = document.defaultView;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  host.replaceChildren(svg);
  host.classList.add('reverb-silence-curve');
  host.tabIndex = 0;
  host.setAttribute('role', 'slider');
  host.setAttribute('aria-label', 'Silence cutoff curve. Drag a point to adjust it. Arrow keys select points and change the cutoff. Shift+Left or Right changes frequency.');
  host.setAttribute('aria-valuemin', '-96');
  host.setAttribute('aria-valuemax', '0');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  let points = defaultReverbSilencePoints();
  let selected = 1;
  let boundPoints = copyPoints(points);
  let boundSelected = selected;
  let samples: number[] | null = null;
  let maximumHz = 20000;
  let editable = true;
  let width = 0;
  let height = 245;
  let plot: Plot = { left: 0, top: 0, right: 0, bottom: 0 };
  let drag: Drag | null = null;
  let disposed = false;
  let tick: Metrics;
  let value: Metrics;

  const metrics = (size: number): Metrics => {
    if (!context) return { ascent: size * 1.06, height: size * 1.32, width: text => text.length * size * .56 };
    context.font = `${size}px "Reverb Sans",Roboto, sans-serif`;
    const measure = context.measureText('Hg');
    const ascent = measure.fontBoundingBoxAscent || size * 1.06;
    const descent = measure.fontBoundingBoxDescent || size * .26;
    return { ascent, height: ascent + descent, width: text => {
      context.font = `${size}px "Reverb Sans",Roboto, sans-serif`;
      return context.measureText(text).width;
    } };
  };
  const headerLines = () => value.width('20000 Hz') + value.width('-96 dBFS') + 12 <= width ? 1 : 2;
  const headerHeight = () => headerLines() * value.height + (headerLines() - 1) * 4;
  const element = (name: string, attributes: Record<string, string | number>, text?: string) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
    if (text != null) node.textContent = text;
    return node;
  };
  const draw = () => {
    if (disposed || width <= 0 || plot.right <= plot.left) return;
    const point = points[selected];
    if (!point) return;
    const content = document.createDocumentFragment();
    const label = (text: string, left: number, top: number, size: number, metric: Metrics, className: string) => {
      content.append(element('text', { x: left, y: top + metric.ascent, 'font-size': size, class: className }, text));
    };
    label(`${point.hz} Hz`, 0, 0, 12, value, 'reverb-curve-value');
    const cutoff = `${point.db} dBFS`;
    label(cutoff, Math.max(0, width - value.width(cutoff)), headerLines() === 1 ? 0 : value.height + 4, 12, value, 'reverb-curve-value');
    for (const db of GRID_DB) {
      label(String(db), plot.left - 8 - tick.width(String(db)), yAt(plot, db) - tick.height / 2, 11, tick, 'reverb-curve-tick');
      content.append(element('line', { x1: plot.left, x2: plot.right, y1: yAt(plot, db), y2: yAt(plot, db), class: 'reverb-curve-grid-db' }));
    }
    for (const hz of GRID_HZ) {
      content.append(element('line', { x1: xAt(plot, hz), x2: xAt(plot, hz), y1: plot.top, y2: plot.bottom, class: 'reverb-curve-grid-hz' }));
    }
    const bottomTop = plot.bottom + 8;
    const lastLeft = plot.right - tick.width('20k');
    label('20', plot.left, bottomTop, 11, tick, 'reverb-curve-tick');
    let previousRight = plot.left + tick.width('20');
    for (const [hz, text] of [[100, '100'], [1000, '1k'], [10000, '10k']] as const) {
      const left = xAt(plot, hz) - tick.width(text) / 2;
      const right = left + tick.width(text);
      if (left >= previousRight + 6 && right <= lastLeft - 6) {
        label(text, left, bottomTop, 11, tick, 'reverb-curve-tick');
        previousRight = right;
      }
    }
    label('20k', lastLeft, bottomTop, 11, tick, 'reverb-curve-tick');
    const measured = samples;
    if (measured && measured.length >= 2) {
      const spectrum = measured.map((db, index) => `L${plot.left + index / (measured.length - 1) * (plot.right - plot.left)} ${yAt(plot, db)}`).join('');
      content.append(element('path', { d: `M${plot.left} ${plot.bottom}${spectrum}L${plot.right} ${plot.bottom}Z`, class: 'reverb-curve-spectrum' }));
    }
    const line = points.map((point, index) => `${index ? 'L' : 'M'}${xAt(plot, point.hz)} ${yAt(plot, point.db)}`).join('');
    content.append(element('path', { d: `${line}L${plot.right} ${plot.bottom}L${plot.left} ${plot.bottom}Z`, class: 'reverb-curve-area' }));
    if (maximumHz < 20000) {
      const x = xAt(plot, maximumHz);
      content.append(element('rect', { x, y: plot.top, width: plot.right - x, height: plot.bottom - plot.top, class: 'reverb-curve-unmeasured' }));
      content.append(element('line', { x1: x, x2: x, y1: plot.top, y2: plot.bottom, class: 'reverb-curve-nyquist' }));
    }
    content.append(element('path', { d: line, class: 'reverb-curve-line' }));
    points.forEach((point, index) => {
      const cx = xAt(plot, point.hz), cy = yAt(plot, point.db);
      if (index === selected) content.append(element('circle', { cx, cy, r: 14, class: 'reverb-curve-halo' }));
      content.append(element('circle', { cx, cy, r: index === selected ? 7 : 5, class: 'reverb-curve-point' }));
    });
    if (editable) for (const point of points) content.append(element('circle', {
      cx: xAt(plot, point.hz), cy: yAt(plot, point.db), r: 32, class: 'reverb-curve-hit',
    }));
    svg.replaceChildren(content);
    host.setAttribute('aria-valuenow', String(point.db));
    host.setAttribute('aria-valuetext', `Point ${selected + 1} of ${points.length}, ${point.hz} Hz, ${point.db} dBFS`);
    host.setAttribute('aria-disabled', String(!editable));
    host.tabIndex = editable ? 0 : -1;
  };
  const releasePointer = (pointer: number) => {
    if (host.hasPointerCapture(pointer)) host.releasePointerCapture(pointer);
  };
  const cancelPointer = () => {
    const previous = drag;
    if (!previous) return;
    drag = null;
    points = previous.original;
    selected = previous.previousSelection;
    releasePointer(previous.pointer);
    draw();
  };
  const measure = () => {
    if (disposed) return;
    const nextWidth = host.clientWidth;
    if (!nextWidth) return;
    if (nextWidth !== width) cancelPointer();
    width = nextWidth;
    tick = metrics(11);
    value = metrics(12);
    const plotHeight = Math.max(160, 4 * (tick.height + 8));
    height = Math.round(Math.max(245, headerHeight() + 16 + tick.height * 1.5 + plotHeight));
    host.style.height = `${height}px`;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    plot = { left: tick.width('-96') + 8, top: headerHeight() + 8 + tick.height / 2, right: width - 16, bottom: height - tick.height - 8 };
    draw();
  };
  const localPoint = (event: PointerEvent, rect: { left: number; top: number; width: number; height: number }) => {
    return { x: (event.clientX - rect.left) * width / Math.max(1, rect.width), y: (event.clientY - rect.top) * height / Math.max(1, rect.height) };
  };
  const move = (event: PointerEvent) => {
    const owner = drag;
    if (!owner || owner.pointer !== event.pointerId) return;
    const position = localPoint(event, owner.viewport);
    const dx = position.x - owner.x, dy = position.y - owner.y;
    if (!owner.moved && dx * dx + dy * dy <= 64) return;
    owner.moved = true;
    const original = owner.original[owner.index];
    if (!original) return;
    const previous = owner.original[owner.index - 1], next = owner.original[owner.index + 1];
    const hz = owner.index === 0 ? 20 : owner.index === owner.original.length - 1 ? 20000
      : clamp(frequencyAt((xAt(owner.plot, original.hz) + dx - owner.plot.left) / (owner.plot.right - owner.plot.left)), (previous?.hz ?? 20) + 1, (next?.hz ?? 20000) - 1);
    const db = clamp(Math.round(-96 * (yAt(owner.plot, original.db) + dy - owner.plot.top) / (owner.plot.bottom - owner.plot.top)), -96, 0);
    points[owner.index] = { hz, db };
    draw();
  };
  const down = (event: PointerEvent) => {
    if (event.button !== 0 || !editable) return;
    if (drag) { cancelPointer(); return; }
    const viewport = host.getBoundingClientRect();
    const position = localPoint(event, viewport);
    if (position.x < plot.left - 32 || position.x > plot.right + 32 || position.y < plot.top - 32 || position.y > plot.bottom + 32) return;
    let nearest = -1, distance = 32 * 32;
    points.forEach((point, index) => {
      const dx = xAt(plot, point.hz) - position.x, dy = yAt(plot, point.db) - position.y;
      const squared = dx * dx + dy * dy;
      if (squared < distance || (squared === distance && (nearest === -1 || index === selected))) { nearest = index; distance = squared; }
    });
    if (nearest === -1) return;
    drag = { pointer: event.pointerId, original: copyPoints(points), previousSelection: selected, index: nearest, x: position.x, y: position.y, moved: false, plot: { ...plot }, viewport };
    selected = nearest;
    host.setPointerCapture(event.pointerId);
    host.focus({ preventScroll: true });
    draw();
    event.preventDefault();
  };
  const publish = () => {
    boundPoints = copyPoints(points);
    boundSelected = selected;
    options.onChange(copyPoints(points), selected);
  };
  const up = (event: PointerEvent) => {
    if (!drag || drag.pointer !== event.pointerId) return;
    move(event);
    drag = null;
    releasePointer(event.pointerId);
    publish();
    draw();
  };
  const pointerCancel = (event: PointerEvent) => { if (drag?.pointer === event.pointerId) cancelPointer(); };
  const key = (event: KeyboardEvent) => {
    if (!editable || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const target = selected;
    cancelPointer();
    selected = target;
    const point = points[selected];
    if (!point) return;
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : -1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      if (!event.shiftKey) selected = clamp(selected + direction, 0, points.length - 1);
      else if (selected > 0 && selected < points.length - 1) points[selected] = {
        hz: clamp(frequencyAt(fraction(point.hz) + direction / 100), (points[selected - 1]?.hz ?? 20) + 1, (points[selected + 1]?.hz ?? 20000) - 1), db: point.db,
      };
    } else points[selected] = { hz: point.hz, db: clamp(point.db + direction, -96, 0) };
    if (!samePoints(points, boundPoints) || selected !== boundSelected) publish();
    draw();
    event.preventDefault();
    event.stopPropagation();
  };
  host.addEventListener('pointerdown', down);
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerup', up);
  host.addEventListener('pointercancel', pointerCancel);
  host.addEventListener('lostpointercapture', pointerCancel);
  host.addEventListener('keydown', key);
  window?.addEventListener('blur', cancelPointer);
  window?.addEventListener('resize', cancelPointer);
  const resize = new ResizeObserver(measure);
  resize.observe(host);
  document.fonts.addEventListener('loadingdone', measure);
  void document.fonts.ready.then(() => { if (!disposed) measure(); });
  measure();
  return {
    render(model: ReverbSilencePoint[], selectedPoint: number, sampledPeaks: number[] | null = null, maxHz = 20000, enabled = true) {
      if (disposed || model.length < 2) return;
      const nextSelection = clamp(selectedPoint, 0, model.length - 1);
      if (drag && (!enabled || !samePoints(model, boundPoints) || nextSelection !== boundSelected)) cancelPointer();
      if (!drag) { points = copyPoints(model); selected = nextSelection; boundPoints = copyPoints(model); boundSelected = nextSelection; }
      samples = sampledPeaks && sampledPeaks.length >= 2 ? [...sampledPeaks] : null;
      maximumHz = clamp(maxHz, 20, 20000);
      editable = enabled;
      draw();
    },
    cancelPointer,
    dispose() {
      cancelPointer();
      disposed = true;
      resize.disconnect();
      document.fonts.removeEventListener('loadingdone', measure);
      window?.removeEventListener('blur', cancelPointer);
      window?.removeEventListener('resize', cancelPointer);
      host.removeEventListener('pointerdown', down);
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerup', up);
      host.removeEventListener('pointercancel', pointerCancel);
      host.removeEventListener('lostpointercapture', pointerCancel);
      host.removeEventListener('keydown', key);
      host.replaceChildren();
    },
  };
}
