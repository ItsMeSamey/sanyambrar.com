/** Port of native SettingsCalibrationFitDial and CalibrationDialGesture. Values are dB. */
export function installReverbCalibrationDial(host: HTMLElement, options: {
  value: number;
  onChange(value: number): void;
}) {
  let value = options.value;
  let pointer = -1;
  let lastX = 0;
  let lastY = 0;
  let enabled = true;
  host.classList.add('calibration-dial');
  host.setAttribute('role', 'slider');
  host.tabIndex = 0;
  host.setAttribute('aria-label', 'Fit to room noise');
  host.setAttribute('aria-valuemin', '-6');
  host.setAttribute('aria-valuemax', '18');
  host.innerHTML = '<svg viewBox="0 0 104 64" aria-hidden="true"><path class="calibration-dial-track"/><path class="calibration-dial-active"/><circle r="5"/></svg><span></span>';
  const track = host.querySelector<SVGPathElement>('.calibration-dial-track')!;
  const active = host.querySelector<SVGPathElement>('.calibration-dial-active')!;
  const bead = host.querySelector<SVGCircleElement>('circle')!;
  const label = host.querySelector('span')!;
  const radius = 64 * .42;
  const point = (angle: number) => {
    const radians = angle * Math.PI / 180;
    return [52 + radius * Math.cos(radians), 32 + radius * Math.sin(radians)];
  };
  const arc = (sweep: number) => {
    const start = point(135);
    const end = point(135 + sweep);
    return `M${start[0]} ${start[1]} A${radius} ${radius} 0 ${sweep > 180 ? 1 : 0} 1 ${end[0]} ${end[1]}`;
  };
  track.setAttribute('d', arc(270));
  const render = () => {
    const fraction = (value + 6) / 24;
    const [x, y] = point(135 + 270 * fraction);
    active.setAttribute('d', arc(270 * fraction));
    active.style.visibility = fraction ? '' : 'hidden';
    bead.setAttribute('cx', String(x));
    bead.setAttribute('cy', String(y));
    const text = `${value >= 0 ? '+' : ''}${Math.round(value)} dB`;
    label.textContent = text;
    host.setAttribute('aria-valuenow', String(value));
    host.setAttribute('aria-valuetext', `${text} relative to room noise`);
  };
  const setValue = (next: number, notify = false) => {
    if (!Number.isFinite(next)) return;
    const bounded = Math.max(-6, Math.min(18, next));
    if (bounded === value) return;
    value = bounded;
    render();
    if (notify) options.onChange(value);
  };
  const cancelPointer = () => {
    const previous = pointer;
    pointer = -1;
    if (previous !== -1 && host.hasPointerCapture(previous)) host.releasePointerCapture(previous);
  };
  const down = (event: PointerEvent) => {
    if (!enabled || event.button !== 0) return;
    pointer = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    host.setPointerCapture(pointer);
    host.focus({ preventScroll: true });
    event.preventDefault();
  };
  const move = (event: PointerEvent) => {
    if (pointer !== event.pointerId || !enabled) return;
    const scale = host.getBoundingClientRect().width / 104 || 1;
    const dx = (event.clientX - lastX) / scale;
    const dy = (event.clientY - lastY) / scale;
    lastX = event.clientX;
    lastY = event.clientY;
    const angle = (135 + 270 * (value + 6) / 24) * Math.PI / 180;
    const tangent = -Math.sin(angle) * dx + Math.cos(angle) * dy;
    if (Math.abs(tangent) > Math.hypot(dx, dy) * 1e-7) setValue(value + tangent / 10, true);
  };
  const keys = new Set(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Home', 'End', 'r', 'R']);
  const keydown = (event: KeyboardEvent) => {
    if (!enabled || !keys.has(event.key)) return;
    const next = event.key === 'Home' ? -6 : event.key === 'End' ? 18 : event.key.toLowerCase() === 'r' ? 6
      : value + (event.key === 'ArrowUp' || event.key === 'ArrowRight' ? 1 : -1);
    setValue(next, true);
    event.preventDefault();
    event.stopPropagation();
  };
  const keyup = (event: KeyboardEvent) => { if (enabled && keys.has(event.key)) { event.preventDefault(); event.stopPropagation(); } };
  host.addEventListener('pointerdown', down);
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerup', cancelPointer);
  host.addEventListener('pointercancel', cancelPointer);
  host.addEventListener('lostpointercapture', cancelPointer);
  host.addEventListener('keydown', keydown);
  host.addEventListener('keyup', keyup);
  render();
  return {
    setValue: (next: number) => setValue(next),
    setEnabled(next: boolean) {
      enabled = next;
      host.setAttribute('aria-disabled', String(!next));
      host.tabIndex = next ? 0 : -1;
      if (!next) cancelPointer();
    },
    cancelPointer,
    dispose() {
      cancelPointer();
      host.removeEventListener('pointerdown', down);
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerup', cancelPointer);
      host.removeEventListener('pointercancel', cancelPointer);
      host.removeEventListener('lostpointercapture', cancelPointer);
      host.removeEventListener('keydown', keydown);
      host.removeEventListener('keyup', keyup);
    },
  };
}
