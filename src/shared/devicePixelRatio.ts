type PixelRatioListener = (ratio: number) => void;

const listeners = new Set<PixelRatioListener>();
let currentRatio = 1;
let media: MediaQueryList | null = null;
let timer = 0;
let listening = false;

const readRatio = () => window.devicePixelRatio || 1;

function rebindMedia() {
  media?.removeEventListener('change', onPossibleChange);
  media = window.matchMedia(`(resolution: ${currentRatio}dppx)`);
  media.addEventListener('change', onPossibleChange);
}

function checkRatio() {
  const next = readRatio();
  if (next === currentRatio) return;
  currentRatio = next;
  rebindMedia();
  for (const listener of [...listeners]) listener(next);
}

function onPossibleChange() {
  checkRatio();
}

function start() {
  if (listening) return;
  listening = true;
  currentRatio = readRatio();
  rebindMedia();
  timer = window.setInterval(checkRatio, 250);
}

function stop() {
  if (!listening) return;
  listening = false;
  media?.removeEventListener('change', onPossibleChange);
  media = null;
  if (timer) window.clearInterval(timer);
  timer = 0;
}

export function watchDevicePixelRatio(listener: PixelRatioListener) {
  listeners.add(listener);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}
