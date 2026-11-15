/*
 * Geometry and discrete input model ported from Reverb's native CompressionSliderView/Model,
 * derived from AndroidX Material3 1.4.0 Slider.kt (Apache-2.0).
 * Copyright 2022 The Android Open Source Project. https://www.apache.org/licenses/LICENSE-2.0
 */
type CompressionSliderOptions = {
  value: number;
  onChange(value: number): void;
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const boundLevel = (value: number) => Math.max(0, Math.min(8, Math.round(Number.isFinite(value) ? value : 5)));
const adjustmentKeys = new Set(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Home', 'End', 'PageUp', 'PageDown']);

function trackPath(x: number, width: number, left: number, right: number) {
  return `M${x + left} 16H${x + width - right}A${right} ${right} 0 0 1 ${x + width} ${16 + right}V${32 - right}A${right} ${right} 0 0 1 ${x + width - right} 32H${x + left}A${left} ${left} 0 0 1 ${x} ${32 - left}V${16 + left}A${left} ${left} 0 0 1 ${x + left} 16Z`;
}

/** Native 48dp compression control. Import its CSS into the Reverb shadow stylesheet. */
export function installReverbCompressionSlider(host: HTMLElement, options: CompressionSliderOptions) {
  const document = host.ownerDocument;
  const view = document.defaultView;
  const svg = document.createElementNS(SVG_NS, 'svg');
  const inactive = document.createElementNS(SVG_NS, 'path');
  const active = document.createElementNS(SVG_NS, 'path');
  const stop = document.createElementNS(SVG_NS, 'circle');
  const ticks = Array.from({ length: 8 }, () => document.createElementNS(SVG_NS, 'circle'));
  const thumb = document.createElementNS(SVG_NS, 'rect');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('preserveAspectRatio', 'none');
  inactive.setAttribute('class', 'reverb-compression-inactive');
  active.setAttribute('class', 'reverb-compression-active');
  stop.setAttribute('class', 'reverb-compression-stop');
  thumb.setAttribute('class', 'reverb-compression-thumb');
  svg.append(inactive, active, stop, ...ticks, thumb);
  host.replaceChildren(svg);
  host.classList.add('reverb-compression-slider');
  host.tabIndex = 0;
  host.setAttribute('role', 'slider');
  if (!host.hasAttribute('aria-label')) host.setAttribute('aria-label', 'Compression level');
  host.setAttribute('aria-valuemin', '0');
  host.setAttribute('aria-valuemax', '8');
  host.setAttribute('aria-orientation', 'horizontal');

  let value = boundLevel(options.value);
  let width = host.clientWidth;
  let rtl = view?.getComputedStyle(host).direction === 'rtl';
  let pointer = -1;
  let dragging = false;
  let downX = 0;
  let downY = 0;
  let previousX = 0;
  let rawOffset = 0;
  let pointerScale = 1;
  let pointerLeft = 0;
  let pointerTop = 0;
  let closed = false;

  const render = () => {
    const thumbWidth = dragging ? 2 : 4;
    const trackWidth = Math.max(0, width - thumbWidth);
    const fraction = value / 8;
    const position = fraction === 0 || fraction === 1
      ? Math.round(trackWidth * fraction)
      : Math.round((trackWidth - 16) * fraction) + 8;
    const trackX = rtl ? width - thumbWidth / 2 - trackWidth : thumbWidth / 2;
    const end = fraction === 0 || fraction === 1 ? trackWidth * fraction : (trackWidth - 16) * fraction + 8;
    const gap = thumbWidth / 2 + 6;
    const activeEnd = end - gap;
    const hasInactive = end < trackWidth - gap - 8;
    const hasActive = activeEnd > (rtl ? 2 : 8);
    svg.setAttribute('viewBox', `0 0 ${Math.max(1, width)} 48`);
    inactive.style.display = hasInactive ? '' : 'none';
    if (hasInactive) {
      const start = end + gap;
      inactive.setAttribute('d', trackPath(trackX + (rtl ? 0 : start), trackWidth - start, rtl ? 8 : 2, rtl ? 2 : 8));
    }
    active.style.display = hasActive ? '' : 'none';
    if (hasActive) active.setAttribute('d', trackPath(trackX + (rtl ? trackWidth - activeEnd : 0), activeEnd, rtl ? 2 : 8, rtl ? 8 : 2));
    stop.style.display = hasInactive ? '' : 'none';
    stop.setAttribute('cx', String(trackX + (rtl ? 8 : trackWidth - 8)));
    stop.setAttribute('cy', '24');
    stop.setAttribute('r', '2');
    ticks.forEach((tick, index) => {
      const center = 8 + (trackWidth - 16) * index / 8;
      tick.style.display = center >= end - gap && center <= end + gap ? 'none' : '';
      tick.setAttribute('cx', String(trackX + (rtl ? trackWidth - center : center)));
      tick.setAttribute('cy', '24');
      tick.setAttribute('r', '2');
      tick.setAttribute('class', center >= 0 && center <= activeEnd ? 'reverb-compression-tick-active' : 'reverb-compression-tick');
    });
    thumb.setAttribute('x', String(rtl ? width - position - thumbWidth : position));
    thumb.setAttribute('y', '2');
    thumb.setAttribute('width', String(thumbWidth));
    thumb.setAttribute('height', '44');
    thumb.setAttribute('rx', String(thumbWidth / 2));
    host.setAttribute('aria-valuenow', String(value));
    host.setAttribute('aria-valuetext', `${value} of 8`);
  };
  const request = (next: number) => {
    const bounded = boundLevel(next);
    if (closed || bounded === value) return;
    value = bounded;
    render();
    options.onChange(value);
  };
  const requestOffset = (offset: number) => {
    const thumbWidth = dragging ? 2 : 4;
    const maximum = Math.max(width - thumbWidth / 2, 0);
    const minimum = Math.min(thumbWidth / 2, maximum);
    // Native pointer snapping keeps the first tick at an exactly equal distance.
    let nearest = 0;
    let distance = Math.abs(minimum - offset);
    for (let index = 1; index <= 8; index++) {
      const next = Math.abs(minimum + (maximum - minimum) * index / 8 - offset);
      if (next < distance) { nearest = index; distance = next; }
    }
    request(nearest);
  };
  const cancelPointer = () => {
    const owned = pointer;
    pointer = -1;
    if (dragging) { dragging = false; render(); }
    if (owned !== -1 && host.hasPointerCapture(owned)) host.releasePointerCapture(owned);
  };
  const pointerDown = (event: PointerEvent) => {
    if (closed || event.button !== 0 || pointer !== -1) return;
    const rect = host.getBoundingClientRect();
    if (rect.width <= 0 || width <= 0) return;
    pointerScale = width / rect.width;
    pointerLeft = rect.left;
    pointerTop = rect.top;
    rtl = view?.getComputedStyle(host).direction === 'rtl';
    downX = previousX = (event.clientX - pointerLeft) * pointerScale;
    downY = (event.clientY - pointerTop) * pointerScale;
    rawOffset = rtl ? width - downX : downX;
    pointer = event.pointerId;
    host.setPointerCapture(pointer);
    host.focus({ preventScroll: true });
  };
  const pointerMove = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    const x = (event.clientX - pointerLeft) * pointerScale;
    const y = (event.clientY - pointerTop) * pointerScale;
    if (!dragging) {
      const dx = x - downX;
      const dy = y - downY;
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { cancelPointer(); return; }
      if (Math.abs(dx) <= 8) return;
      dragging = true;
      rawOffset += (rtl ? -1 : 1) * (dx - Math.sign(dx) * 8);
      render();
    } else rawOffset += (rtl ? -1 : 1) * (x - previousX);
    previousX = x;
    requestOffset(rawOffset);
    event.preventDefault();
  };
  const pointerUp = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    if (!dragging) {
      const x = (event.clientX - pointerLeft) * pointerScale;
      const y = (event.clientY - pointerTop) * pointerScale;
      if (x >= 0 && x <= width && y >= 0 && y <= 48) requestOffset(rawOffset);
    }
    cancelPointer();
  };
  const pointerCancel = (event: PointerEvent) => { if (event.pointerId === pointer) cancelPointer(); };
  const keyDown = (event: KeyboardEvent) => {
    if (!adjustmentKeys.has(event.key)) return;
    const sign = rtl ? -1 : 1;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 8
      : event.key === 'PageUp' ? value - 1 : event.key === 'PageDown' ? value + 1
      : value + (event.key === 'ArrowUp' || event.key === 'ArrowRight' ? sign : -sign);
    request(next);
    event.preventDefault();
  };
  const keyUp = (event: KeyboardEvent) => { if (adjustmentKeys.has(event.key)) event.preventDefault(); };
  const resize = new ResizeObserver(entries => {
    const next = entries[0]?.contentRect.width ?? host.clientWidth;
    if (next === width || closed) return;
    cancelPointer();
    width = next;
    render();
  });
  host.addEventListener('pointerdown', pointerDown);
  host.addEventListener('pointermove', pointerMove);
  host.addEventListener('pointerup', pointerUp);
  host.addEventListener('pointercancel', pointerCancel);
  host.addEventListener('lostpointercapture', pointerCancel);
  host.addEventListener('keydown', keyDown);
  host.addEventListener('keyup', keyUp);
  view?.addEventListener('blur', cancelPointer);
  resize.observe(host);
  render();
  return {
    setValue(next: number) { if (!closed) { value = boundLevel(next); render(); } },
    cancelPointer,
    dispose() {
      if (closed) return;
      cancelPointer();
      closed = true;
      resize.disconnect();
      host.removeEventListener('pointerdown', pointerDown);
      host.removeEventListener('pointermove', pointerMove);
      host.removeEventListener('pointerup', pointerUp);
      host.removeEventListener('pointercancel', pointerCancel);
      host.removeEventListener('lostpointercapture', pointerCancel);
      host.removeEventListener('keydown', keyDown);
      host.removeEventListener('keyup', keyUp);
      view?.removeEventListener('blur', cancelPointer);
    },
  };
}
