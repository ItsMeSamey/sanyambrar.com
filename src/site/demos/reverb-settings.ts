import type { ReverbDemoDocument } from './reverb-runtime.ts';

export type ReverbSettingsExtras = {
  compression: boolean;
  compressionLevel: number;
  skipSilence: boolean;
  calibrationFit: number;
  calibration: number[];
  notificationSave: boolean;
  notificationSeconds: number;
  autoStart: boolean;
  quickTiles: { buffer: 'one' | 'loop'; seconds: number }[];
};

type Options = {
  changed(): void;
  sampleFormat(): string;
  setTimeout(handler: () => void, delay: number): number;
  clearTimeout(id: number): void;
  feedback(message: string): void;
};

const formatDuration = (seconds: number) => {
  const value = Math.max(1, Math.min(86400, Math.round(seconds)));
  return [Math.floor(value / 3600), Math.floor(value % 3600 / 60), value % 60]
    .map(part => String(part).padStart(2, '0')).join(':');
};
const parseDuration = (value: string) => {
  const parts = value.trim().split(':');
  if (parts.length !== 3 || parts.some(part => !/^\d+$/.test(part))) return null;
  const [hours = 0, minutes = 0, seconds = 0] = parts.map(Number);
  const duration = hours * 3600 + minutes * 60 + seconds;
  return minutes < 60 && seconds < 60 && duration > 0 && duration <= 86400 ? duration : null;
};

export function installReverbSettings(root: ReverbDemoDocument, options: Options) {
  const byId = <T extends HTMLElement = HTMLElement>(id: string): T => {
    const element = root.querySelector<T>(`#${id}`);
    if (!element) throw new Error(`Reverb settings is missing #${id}`);
    return element;
  };
  let state: ReverbSettingsExtras = {
    compression: false,
    compressionLevel: 5,
    skipSilence: false,
    calibrationFit: 6,
    calibration: [-66, -65, -64, -63, -62, -60, -58, -57],
    notificationSave: true,
    notificationSeconds: 120,
    autoStart: false,
    quickTiles: [],
  };
  let calibrationTimer = 0;
  let tileBuffer: 'one' | 'loop' = 'loop';
  const compressionSlider = byId<HTMLInputElement>('compressionLevel');
  const calibrationFit = byId<HTMLInputElement>('calibrationFit');
  const notificationDuration = byId<HTMLInputElement>('notificationDuration');
  const tileDuration = byId<HTMLInputElement>('quickTileDuration');
  const tileEditor = byId('quickTileEditor');
  const tileList = byId('quickTileList');
  const chart = root.querySelector<SVGSVGElement>('#calibrationChart');
  const curve = root.querySelector<SVGPathElement>('#calibrationCurve');
  const handles = [...root.querySelectorAll<SVGCircleElement>('#calibrationChart circle[data-band]')];
  const measureButton = byId<HTMLButtonElement>('calibrateRoom');
  const setSwitch = (id: string, on: boolean, body?: string) => {
    const button = byId<HTMLButtonElement>(id);
    button.classList.toggle('on', on);
    button.setAttribute('aria-checked', String(on));
    if (body) byId(body).hidden = !on;
  };
  const renderCurve = () => {
    const levels = state.calibration.map(db => Math.max(-96, Math.min(0, db + state.calibrationFit - 6)));
    const points = levels.map((db, index) => [28 + index * 42, 180 - (db + 96) / 96 * 160]);
    curve?.setAttribute('d', points.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(''));
    handles.forEach((handle, index) => {
      const point = points[index];
      if (!point) return;
      handle.setAttribute('cx', String(point[0]));
      handle.setAttribute('cy', String(point[1]));
      handle.setAttribute('aria-valuenow', String(levels[index]));
    });
  };
  const renderTiles = () => {
    tileList.replaceChildren();
    state.quickTiles.forEach((tile, index) => {
      const row = root.createElement('div');
      row.className = 'quick-save-tile';
      const label = root.createElement('span');
      label.textContent = `${tile.buffer === 'one' ? 'One-shot' : 'Looping'} · ${formatDuration(tile.seconds)}`;
      const remove = root.createElement('button');
      remove.type = 'button';
      remove.className = 'tile-remove';
      remove.textContent = 'Delete';
      remove.setAttribute('aria-label', `Delete ${label.textContent} tile`);
      remove.addEventListener('click', () => {
        state.quickTiles.splice(index, 1);
        renderTiles();
        options.changed();
      });
      row.append(label, remove);
      tileList.append(row);
    });
    byId<HTMLButtonElement>('newQuickTile').disabled = state.quickTiles.length >= 8;
  };
  const render = () => {
    setSwitch('compressionSwitch', state.compression, 'compressionBody');
    setSwitch('silenceSwitch', state.skipSilence, 'silenceBody');
    setSwitch('notificationSwitch', state.notificationSave, 'notificationBody');
    setSwitch('autoStartSwitch', state.autoStart);
    compressionSlider.value = String(state.compressionLevel);
    byId('compressionValue').textContent = String(state.compressionLevel);
    byId('flacWarning').hidden = !state.compression || options.sampleFormat() === '16-bit integer';
    calibrationFit.value = String(state.calibrationFit);
    byId('calibrationFitValue').textContent = `${state.calibrationFit >= 0 ? '+' : ''}${state.calibrationFit} dB`;
    notificationDuration.value = formatDuration(state.notificationSeconds);
    notificationDuration.removeAttribute('aria-invalid');
    renderCurve();
    renderTiles();
  };
  const toggle = (id: string, key: 'compression' | 'skipSilence' | 'notificationSave' | 'autoStart') => {
    byId(id).addEventListener('click', () => {
      state[key] = !state[key];
      render();
      options.changed();
    });
  };
  toggle('compressionSwitch', 'compression');
  toggle('silenceSwitch', 'skipSilence');
  toggle('notificationSwitch', 'notificationSave');
  toggle('autoStartSwitch', 'autoStart');
  compressionSlider.addEventListener('input', () => {
    state.compressionLevel = Number(compressionSlider.value);
    byId('compressionValue').textContent = compressionSlider.value;
    options.changed();
  });
  calibrationFit.addEventListener('input', () => {
    state.calibrationFit = Number(calibrationFit.value);
    byId('calibrationFitValue').textContent = `${state.calibrationFit >= 0 ? '+' : ''}${state.calibrationFit} dB`;
    renderCurve();
    options.changed();
  });
  notificationDuration.addEventListener('input', () => {
    const seconds = parseDuration(notificationDuration.value);
    notificationDuration.setAttribute('aria-invalid', String(seconds == null));
    if (seconds != null) state.notificationSeconds = seconds;
    options.changed();
  });
  const installDurationKeys = (input: HTMLInputElement, changed: () => void) => {
    input.addEventListener('keydown', event => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      const current = parseDuration(input.value) ?? 120;
      const caret = input.selectionStart ?? 8;
      const step = caret <= 2 ? 3600 : caret <= 5 ? 60 : 1;
      input.value = formatDuration(current + (event.key === 'ArrowUp' ? step : -step));
      input.setSelectionRange(caret, caret);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      changed();
      event.preventDefault();
    });
  };
  installDurationKeys(notificationDuration, () => {});
  installDurationKeys(tileDuration, () => {});

  let draggedBand = -1;
  let pointerId = -1;
  const stopDrag = () => {
    const previousId = pointerId;
    draggedBand = -1;
    pointerId = -1;
    if (previousId !== -1 && chart?.hasPointerCapture(previousId)) chart.releasePointerCapture(previousId);
  };
  const updateBand = (event: PointerEvent) => {
    if (!chart || draggedBand < 0) return;
    const rect = chart.getBoundingClientRect();
    const y = (event.clientY - rect.top) / Math.max(1, rect.height) * 220;
    state.calibration[draggedBand] = Math.round(Math.max(-96, Math.min(0, (180 - y) / 160 * 96 - 96 - state.calibrationFit + 6)));
    renderCurve();
    options.changed();
  };
  handles.forEach((handle, index) => {
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !chart) return;
      draggedBand = index;
      pointerId = event.pointerId;
      chart.setPointerCapture(event.pointerId);
      updateBand(event);
      event.preventDefault();
    });
    handle.addEventListener('keydown', event => {
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      const current = state.calibration[index] ?? -60;
      state.calibration[index] = event.key === 'Home' ? -96 : event.key === 'End' ? 0
        : Math.max(-96, Math.min(0, current + (event.key === 'ArrowUp' ? 1 : -1)));
      renderCurve();
      options.changed();
      event.preventDefault();
    });
  });
  chart?.addEventListener('pointermove', event => { if (event.pointerId === pointerId) updateBand(event); });
  chart?.addEventListener('pointerup', stopDrag);
  chart?.addEventListener('pointercancel', stopDrag);
  chart?.addEventListener('lostpointercapture', stopDrag);
  measureButton.addEventListener('click', () => {
    if (calibrationTimer) {
      options.clearTimeout(calibrationTimer);
      calibrationTimer = 0;
      measureButton.textContent = 'Calibrate';
      byId('calibrationStatus').textContent = 'Sample audio calibration';
      return;
    }
    measureButton.textContent = 'Cancel';
    byId('calibrationStatus').textContent = 'Measuring sample audio…';
    calibrationTimer = options.setTimeout(() => {
      calibrationTimer = 0;
      state.calibration = [-72, -68, -65, -70, -73, -76, -78, -80];
      measureButton.textContent = 'Calibrate';
      byId('calibrationStatus').textContent = 'Sample calibration ready';
      renderCurve();
      options.changed();
    }, 4000);
  });
  byId('newQuickTile').addEventListener('click', () => {
    tileEditor.hidden = false;
    byId('newQuickTile').hidden = true;
    tileDuration.value = '00:02:00';
    tileDuration.focus();
  });
  const closeTileEditor = (restoreFocus = true) => {
    tileEditor.hidden = true;
    byId('newQuickTile').hidden = false;
    if (restoreFocus) byId('newQuickTile').focus();
  };
  byId('cancelQuickTile').addEventListener('click', () => closeTileEditor());
  root.querySelectorAll<HTMLButtonElement>('[data-tile-buffer]').forEach(button => {
    button.addEventListener('click', () => {
      tileBuffer = button.dataset.tileBuffer === 'loop' ? 'loop' : 'one';
      root.querySelectorAll<HTMLButtonElement>('[data-tile-buffer]').forEach(choice => {
        const selected = choice === button;
        choice.classList.toggle('selected', selected);
        choice.setAttribute('aria-pressed', String(selected));
      });
    });
  });
  byId('saveQuickTile').addEventListener('click', () => {
    const seconds = parseDuration(tileDuration.value);
    tileDuration.setAttribute('aria-invalid', String(seconds == null));
    if (seconds == null || state.quickTiles.length >= 8) return;
    state.quickTiles.push({ buffer: tileBuffer, seconds });
    renderTiles();
    closeTileEditor();
    options.changed();
  });
  render();
  return {
    snapshot(): ReverbSettingsExtras { return structuredClone(state); },
    restore(value: ReverbSettingsExtras) { state = structuredClone(value); render(); closeTileEditor(false); },
    refresh: render,
    valid: () => !state.notificationSave || parseDuration(notificationDuration.value) != null,
    cancelPointer: stopDrag,
    dispose() {
      stopDrag();
      if (calibrationTimer) options.clearTimeout(calibrationTimer);
      calibrationTimer = 0;
    },
  };
}
