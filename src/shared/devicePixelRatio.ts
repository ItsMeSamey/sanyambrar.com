type PixelRatioListener = (ratio: number) => void;

const listeners = new Set<PixelRatioListener>();
let currentRatio = 1;
let media: MediaQueryList | null = null;
let timer = 0;
let listening = false;
const SAFETY_POLL_MS = 2000;

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

function scheduleSafetyPoll() {
  if (!listening || document.hidden || timer) return;
  timer = window.setTimeout(() => {
    timer = 0;
    checkRatio();
    scheduleSafetyPoll();
  }, SAFETY_POLL_MS);
}

function onVisibilityChange() {
  checkRatio();
  if (document.hidden) {
    if (timer) window.clearTimeout(timer);
    timer = 0;
  } else {
    scheduleSafetyPoll();
  }
}

function start() {
  if (listening) return;
  listening = true;
  currentRatio = readRatio();
  rebindMedia();
  window.addEventListener('resize', onPossibleChange, { passive: true });
  window.visualViewport?.addEventListener('resize', onPossibleChange, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  scheduleSafetyPoll();
}

function stop() {
  if (!listening) return;
  listening = false;
  media?.removeEventListener('change', onPossibleChange);
  media = null;
  window.removeEventListener('resize', onPossibleChange);
  window.visualViewport?.removeEventListener('resize', onPossibleChange);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  if (timer) window.clearTimeout(timer);
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
