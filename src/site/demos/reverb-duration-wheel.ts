type DurationWheelOptions = {
  value: number;
  maximumSeconds?: number;
  label?: string;
  onChange(seconds: number): void;
  onInteractionChange?(active: boolean): void;
};

type Wheel = { position: number; values: number[] };
type WheelFace = { group: SVGGElement; text: SVGTextElement };

const NS = 'http://www.w3.org/2000/svg';
const PROFILE_LABELS = ['1x', '5x', '15x'];
const PART_LABELS = ['Hours', 'Minutes', 'Seconds', 'Step'];
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const modulo = (value: number, count: number) => ((value % count) + count) % count;
const parts = (seconds: number) => [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60];
const safeSeconds = (value: number) => clamp(Number.isFinite(value) ? Math.round(value) : 1, 1, 86400);
const selected = (wheel: Wheel) => wheel.values[modulo(Math.round(wheel.position), wheel.values.length)] ?? 0;

/** Port of RangeDurationWheelView: retain the native cylindrical projection and shared cell rails. */
export function installReverbDurationWheel(host: HTMLElement, options: DurationWheelOptions) {
  const doc = host.ownerDocument;
  const win = doc.defaultView;
  if (!win) throw new Error('Reverb duration wheel requires a document window');
  const abort = new AbortController();
  const listenerOptions = { signal: abort.signal };
  const createSvg = <K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] => doc.createElementNS(NS, tag);
  const svg = createSvg('svg');
  svg.classList.add('reverb-duration-wheel-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  host.classList.add('reverb-duration-wheel');
  host.setAttribute('role', 'group');
  host.setAttribute('aria-label', options.label ?? 'Save duration');
  const grids = Array.from({ length: 4 }, () => {
    const group = createSvg('g');
    group.classList.add('duration-wheel-grid');
    const lines = Array.from({ length: 22 }, () => {
      const line = createSvg('line');
      group.append(line);
      return line;
    });
    svg.append(group);
    return lines;
  });
  const divider = createSvg('line');
  divider.classList.add('duration-wheel-divider');
  svg.append(divider);
  const colons = Array.from({ length: 2 }, () => {
    const text = createSvg('text');
    text.textContent = ':';
    text.classList.add('duration-wheel-colon');
    svg.append(text);
    return text;
  });
  const faces: WheelFace[][] = Array.from({ length: 4 }, (_, index) => Array.from({ length: 7 }, () => {
    const group = createSvg('g');
    const text = createSvg('text');
    text.classList.add(index === 3 ? 'duration-wheel-profile' : 'duration-wheel-number');
    group.append(text);
    svg.append(group);
    return { group, text };
  }));
  const targets = Array.from({ length: 4 }, (_, index) => {
    const target = doc.createElement('div');
    target.className = 'duration-wheel-target';
    target.tabIndex = 0;
    target.setAttribute('role', 'spinbutton');
    target.setAttribute('aria-label', PART_LABELS[index] ?? 'Duration');
    target.setAttribute('aria-valuemin', index === 3 ? '1' : '0');
    return target;
  });
  host.replaceChildren(svg, ...targets);

  let value = safeSeconds(options.value);
  let maximum = safeSeconds(options.maximumSeconds ?? 86400);
  let profile = 0;
  let width = Math.max(1, host.clientWidth || 350);
  let active = -1;
  let pointer = -1;
  let downY = 0;
  let downPosition = 0;
  let dragged = false;
  let dragScale = 1;
  let frame = 0;
  let animationIndex = -1;
  let interacting = false;
  let disposed = false;
  let numberBaseline = 8.55;
  let profileBaseline = 4.788;
  const wheels: Wheel[] = [
    { position: 0, values: [0] },
    { position: 0, values: [0] },
    { position: 0, values: [0] },
    { position: 0, values: [0, 1, 2] },
  ];

  const values = (step: number, maximumValue: number, current: number, includeMaximum: boolean) => {
    const result = Array.from({ length: Math.floor(maximumValue / step) + 1 }, (_, index) => index * step);
    if (includeMaximum && maximumValue % step !== 0) result.push(maximumValue);
    if (!result.includes(current)) result.push(current);
    return result.sort((a, b) => a - b);
  };
  const rebuild = (nextParts = parts(value)) => {
    const [hours = 0, minutes = 0, seconds = 0] = nextParts;
    const [maxHours = 0, maxMinutes = 0, maxSeconds = 0] = parts(maximum);
    const step = profile === 1 ? 5 : profile === 2 ? 15 : 1;
    const minuteConstrained = hours === maxHours;
    const secondConstrained = minuteConstrained && minutes === maxMinutes;
    const nextValues = [
      values(1, maxHours, hours, true),
      values(step, minuteConstrained ? maxMinutes : 59, minutes, minuteConstrained),
      values(step, secondConstrained ? maxSeconds : 59, seconds, secondConstrained),
    ];
    nextValues.forEach((entries, index) => {
      const wheel = wheels[index];
      if (!wheel) return;
      wheel.values = entries;
      wheel.position = Math.max(0, entries.indexOf(nextParts[index] ?? 0));
    });
    const profileWheel = wheels[3];
    if (profileWheel) profileWheel.position = profile;
  };
  const geometry = () => {
    const profileWidth = width * 0.19;
    const profileStart = width - profileWidth;
    const timeWidth = Math.max(1, profileStart - 14);
    const columnWidth = timeWidth / 3;
    return { profileWidth, profileStart, timeWidth, columnWidth,
      centers: [columnWidth * 0.5, columnWidth * 1.5, columnWidth * 2.5, profileStart + profileWidth * 0.5] };
  };
  const line = (element: SVGLineElement, x1: number, y1: number, x2: number, y2: number, opacity: number) => {
    element.setAttribute('x1', String(x1));
    element.setAttribute('y1', String(y1));
    element.setAttribute('x2', String(x2));
    element.setAttribute('y2', String(y2));
    element.setAttribute('opacity', String(Math.floor(opacity * 255) / 255));
    element.style.display = '';
  };
  const render = () => {
    if (disposed) return;
    const { profileWidth, profileStart, columnWidth, centers } = geometry();
    svg.setAttribute('viewBox', `0 0 ${width} 160`);
    const displayed = wheels.slice(0, 3).map(selected);
    const [hours = 0, minutes = 0, seconds = 0] = displayed;
    const [maxHours = 0, maxMinutes = 0, maxSeconds = 0] = parts(maximum);
    const errorMask = hours > maxHours ? 7 : hours < maxHours ? 0
      : minutes > maxMinutes ? 6 : minutes < maxMinutes ? 0 : seconds > maxSeconds ? 4 : 0;
    line(divider, profileStart - 7, 0, profileStart - 7, 160, 0.6);
    colons.forEach((colon, index) => {
      colon.setAttribute('x', String(columnWidth * (index + 1)));
      colon.setAttribute('y', String(79.25 + numberBaseline));
      colon.style.fill = errorMask & (index === 0 ? 1 : 3) ? 'var(--error)' : 'var(--on-surface-variant)';
    });
    wheels.forEach((wheel, index) => {
      const centerX = centers[index] ?? 0;
      const base = Math.floor(wheel.position);
      const baseHalfWidth = index === 3 ? profileWidth * 0.34 : columnWidth * 0.38;
      const grid = grids[index] ?? [];
      let usedLines = 0;
      let previous: { left: number; right: number; y: number; opacity: number } | undefined;
      for (let offset = -4; offset <= 3; offset++) {
        const relative = base + offset + 0.5 - wheel.position;
        const absolute = Math.abs(relative);
        if (absolute >= 2.12) continue;
        const radians = relative * 42 * Math.PI / 180;
        const cosine = Math.cos(radians);
        if (cosine <= 0) continue;
        const y = 79.25 + Math.sin(radians) * 52;
        const projection = 320 / (320 - (cosine * 52 - 52));
        const halfWidth = baseHalfWidth * projection * (1 - Math.min(absolute, 1.8) * 0.035);
        const left = centerX - halfWidth;
        const right = centerX + halfWidth;
        const edgeFade = clamp((2.12 - absolute) / 0.75, 0, 1);
        const opacity = 0.36 * cosine * (0.35 + edgeFade * 0.65);
        const boundary = grid[usedLines++];
        if (boundary) line(boundary, left, y, right, y, opacity);
        if (previous) {
          const railAlpha = Math.min(previous.opacity, opacity);
          const leftRail = grid[usedLines++];
          const rightRail = grid[usedLines++];
          if (leftRail) line(leftRail, previous.left, previous.y, left, y, railAlpha);
          if (rightRail) line(rightRail, previous.right, previous.y, right, y, railAlpha);
        }
        previous = { left, right, y, opacity };
      }
      grid.slice(usedLines).forEach(unused => { unused.style.display = 'none'; });
      (faces[index] ?? []).forEach((face, faceIndex) => {
        const logical = base + faceIndex - 3;
        const relative = logical - wheel.position;
        const absolute = Math.abs(relative);
        const radians = relative * 42 * Math.PI / 180;
        const cosine = Math.cos(radians);
        if (absolute >= 2.34 || cosine <= 0) { face.group.style.display = 'none'; return; }
        face.group.style.display = '';
        const candidate = wheel.values[modulo(logical, wheel.values.length)] ?? 0;
        const projected = 320 / (320 - (cosine * 52 - 52));
        const scale = projected * (1 - Math.min(absolute, 1.5) * 0.05);
        const edgeFade = clamp((2.34 - absolute) / 0.42, 0, 1);
        const opacity = Math.min(1, Math.max(cosine, 0.18) * (0.55 + edgeFade * 0.45));
        const centerMix = clamp(1 - absolute / 0.85, 0, 1);
        const isSelected = logical === Math.round(wheel.position);
        const candidateSeconds = (index === 0 ? candidate : hours) * 3600
          + (index === 1 ? candidate : minutes) * 60 + (index === 2 ? candidate : seconds);
        const overLimit = index < 3 && (isSelected ? !!(errorMask & (1 << index)) : candidateSeconds > maximum);
        face.group.setAttribute('transform', `translate(${centerX} ${79.25 + Math.sin(radians) * 52}) scale(${scale} ${scale * cosine})`);
        face.group.setAttribute('opacity', String(Math.floor(opacity * 255) / 255));
        face.text.style.fill = overLimit ? 'var(--error)' : `color-mix(in srgb, var(--on-surface) ${centerMix * 100}%, var(--on-surface-variant))`;
        face.text.setAttribute('y', String(index === 3 ? profileBaseline : numberBaseline));
        face.text.textContent = index === 3 ? PROFILE_LABELS[candidate] ?? '1x' : String(candidate).padStart(2, '0');
      });
      const target = targets[index];
      if (!target) return;
      const targetWidth = index === 3 ? profileWidth : columnWidth * 0.8;
      target.style.left = `${index === 3 ? profileStart : centerX - targetWidth / 2}px`;
      target.style.width = `${targetWidth}px`;
      const current = selected(wheel);
      target.setAttribute('aria-valuenow', String(index === 3 ? [1, 5, 15][current] : current));
      target.setAttribute('aria-valuemax', String(index === 3 ? 15 : Math.max(...wheel.values)));
      target.setAttribute('aria-valuetext', index === 3 ? `${PROFILE_LABELS[current]} step` : `${current} ${PART_LABELS[index]?.toLowerCase()}`);
      target.toggleAttribute('data-active', index === active || index === animationIndex);
    });
  };
  const stopAnimation = () => {
    if (frame) win.cancelAnimationFrame(frame);
    frame = 0;
    animationIndex = -1;
  };
  const setInteracting = (next: boolean) => {
    if (interacting === next) return;
    interacting = next;
    options.onInteractionChange?.(next);
  };
  const releaseCapture = () => {
    const previousPointer = pointer;
    pointer = -1;
    if (previousPointer >= 0 && host.hasPointerCapture(previousPointer)) host.releasePointerCapture(previousPointer);
  };
  const cancelPointer = () => {
    active = -1;
    stopAnimation();
    releaseCapture();
    rebuild();
    render();
    setInteracting(false);
  };
  const finish = (index: number) => {
    if (index === 3) profile = selected(wheels[3]!);
    const [hours = 0, minutes = 0, seconds = 0] = wheels.slice(0, 3).map(selected);
    const next = clamp(hours * 3600 + minutes * 60 + seconds, 1, maximum);
    const changed = value !== next;
    value = next;
    rebuild();
    render();
    try { if (changed) options.onChange(value); }
    finally { setInteracting(false); }
  };
  const animateTo = (index: number, target: number) => {
    stopAnimation();
    const wheel = wheels[index];
    if (!wheel) return;
    const start = wheel.position;
    if (Math.abs(target - start) < 0.0001 || doc.hidden || win.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      wheel.position = target;
      finish(index);
      return;
    }
    animationIndex = index;
    const started = win.performance.now();
    const tick = (now: number) => {
      frame = 0;
      if (disposed || animationIndex !== index) return;
      const progress = clamp((now - started) / 150, 0, 1);
      wheel.position = start + (target - start) * (1 - (1 - progress) ** 3);
      render();
      if (progress < 1) frame = win.requestAnimationFrame(tick);
      else { animationIndex = -1; wheel.position = target; finish(index); }
    };
    frame = win.requestAnimationFrame(tick);
  };

  targets.forEach((target, index) => {
    target.addEventListener('pointerdown', event => {
      if (event.button !== 0 || pointer !== -1) return;
      stopAnimation();
      active = index;
      pointer = event.pointerId;
      downY = event.clientY;
      downPosition = wheels[index]?.position ?? 0;
      dragged = false;
      dragScale = host.getBoundingClientRect().height / 160 || 1;
      host.setPointerCapture(pointer);
      target.focus({ preventScroll: true });
      render();
      setInteracting(true);
      event.preventDefault();
    }, listenerOptions);
    target.addEventListener('keydown', event => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) return;
      cancelPointer();
      const wheel = wheels[index];
      if (!wheel) return;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? wheel.values.length - 1
        : Math.round(wheel.position) + (event.key === 'PageUp' ? 5 : event.key === 'PageDown' ? -5
          : event.key === 'ArrowUp' || event.key === 'ArrowRight' ? 1 : -1);
      wheel.position = next;
      finish(index);
      event.preventDefault();
    }, listenerOptions);
    target.addEventListener('wheel', event => {
      if (event.deltaY === 0) return;
      cancelPointer();
      const wheel = wheels[index];
      if (!wheel) return;
      wheel.position += event.deltaY > 0 ? 1 : -1;
      setInteracting(true);
      animateTo(index, Math.round(wheel.position));
      event.preventDefault();
    }, { ...listenerOptions, passive: false });
  });
  host.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer || active < 0) return;
    const delta = (event.clientY - downY) / dragScale;
    if (Math.abs(delta) > 8) dragged = true;
    const wheel = wheels[active];
    if (!wheel) return;
    wheel.position = downPosition - delta / 56;
    render();
    event.preventDefault();
  }, listenerOptions);
  host.addEventListener('pointerup', event => {
    if (event.pointerId !== pointer || active < 0) return;
    const index = active;
    const wheel = wheels[index];
    if (!wheel) return;
    if (!dragged) {
      const y = (event.clientY - host.getBoundingClientRect().top) / dragScale;
      if (y < 160 / 3) wheel.position -= 1;
      else if (y > 320 / 3) wheel.position += 1;
    }
    active = -1;
    releaseCapture();
    animateTo(index, Math.round(wheel.position));
    event.preventDefault();
  }, listenerOptions);
  host.addEventListener('pointercancel', event => { if (event.pointerId === pointer) cancelPointer(); }, listenerOptions);
  host.addEventListener('lostpointercapture', () => { if (pointer !== -1) cancelPointer(); }, listenerOptions);
  win.addEventListener('blur', cancelPointer, listenerOptions);
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) cancelPointer(); }, listenerOptions);
  const resize = new ResizeObserver(entries => {
    const nextWidth = entries[0]?.contentRect.width;
    if (!nextWidth || nextWidth === width) return;
    width = nextWidth;
    render();
  });
  resize.observe(host);
  const measureBaselines = () => {
    if (disposed) return;
    const context = doc.createElement('canvas').getContext('2d');
    if (!context) return;
    const baseline = (size: number, bold: boolean, fallback: number) => {
      context.font = `${bold ? '700' : '400'} ${size}px "Reverb Sans",Roboto, sans-serif`;
      const metrics = context.measureText('00');
      return Number.isFinite(metrics.fontBoundingBoxAscent) && Number.isFinite(metrics.fontBoundingBoxDescent)
        ? (metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2 : fallback;
    };
    numberBaseline = baseline(25, false, 8.55);
    profileBaseline = baseline(14, true, 4.788);
    render();
  };
  rebuild();
  render();
  measureBaselines();
  void doc.fonts.ready.then(measureBaselines);
  return {
    setValue(seconds: number) {
      cancelPointer();
      value = safeSeconds(seconds);
      rebuild();
      render();
    },
    getValue: () => value,
    isInteracting: () => interacting,
    setMaximumSeconds(seconds: number) {
      cancelPointer();
      maximum = safeSeconds(seconds);
      rebuild();
      render();
    },
    cancelPointer,
    dispose() {
      if (disposed) return;
      cancelPointer();
      disposed = true;
      abort.abort();
      resize.disconnect();
    },
  };
}
