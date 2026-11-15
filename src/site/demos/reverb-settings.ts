import type { ReverbDemoDocument } from './reverb-runtime.ts';
import { installReverbCalibrationDial } from './reverb-calibration-dial.ts';
import { installReverbDurationWheel } from './reverb-duration-wheel.ts';
import { installReverbCompressionSlider } from './reverb-compression-slider.ts';
import { defaultReverbSilencePoints, sampledReverbSilencePoints, installReverbSilenceCurve, type ReverbSilencePoint } from './reverb-silence-curve.ts';

export type ReverbSettingsExtras = {
  compression: boolean;
  compressionLevel: number;
  skipSilence: boolean;
  calibrationFit: number;
  calibration: ReverbSilencePoint[];
  sampledPeaks: number[] | null;
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

/** Settings uses the same native control geometry with local sample state only. */
export function installReverbSettings(root: ReverbDemoDocument, options: Options) {
  const byId = <T extends HTMLElement = HTMLElement>(id: string): T => {
    const element = root.querySelector<T>(`#${id}`);
    if (!element) throw new Error(`Reverb settings is missing #${id}`);
    return element;
  };
  let state: ReverbSettingsExtras = {
    compression: false, compressionLevel: 5, skipSilence: false,
    calibrationFit: 6, calibration: defaultReverbSilencePoints(), sampledPeaks: null,
    notificationSave: true, notificationSeconds: 120, autoStart: false, quickTiles: [],
  };
  let calibrationTimer = 0;
  let holdTimer = 0;
  let holdingCalibration = false;
  let calibrationPointer = -1;
  let suppressCalibrationClick = false;
  let selectedBand = 1;
  let tileBuffer: 'one' | 'loop' = 'loop';
  const tileEditor = byId('quickTileEditor');
  const tileList = byId('quickTileList');
  const measureButton = byId<HTMLButtonElement>('calibrateRoom');
  const chart = installReverbSilenceCurve(byId('calibrationChart'), {
    onChange(points, selected) {
      state.calibration = points;
      selectedBand = selected;
      options.changed();
    },
  });
  const fitDial = installReverbCalibrationDial(byId('calibrationFit'), {
    value: state.calibrationFit,
    onChange(value) {
      state.calibrationFit = value;
      if (state.sampledPeaks) state.calibration = sampledReverbSilencePoints(state.sampledPeaks, value);
      renderCurve();
      options.changed();
    },
  });
  const compressionSlider = installReverbCompressionSlider(byId('compressionLevel'), {
    value: state.compressionLevel,
    onChange(value) { state.compressionLevel = value; options.changed(); },
  });
  const notificationWheel = installReverbDurationWheel(byId('notificationDuration'), {
    value: state.notificationSeconds, label: 'Notification save duration',
    onInteractionChange: () => options.changed(),
    onChange(value) { state.notificationSeconds = value; options.changed(); },
  });
  const tileWheel = installReverbDurationWheel(byId('quickTileDuration'), { value: 120, label: 'Quick-save tile duration', onChange() {}, onInteractionChange: () => options.changed() });
  const setSwitch = (id: string, on: boolean, body?: string) => {
    const button = byId<HTMLButtonElement>(id);
    button.classList.toggle('on', on);
    button.setAttribute('aria-checked', String(on));
    if (body) byId(body).hidden = !on;
  };
  function renderCurve() {
    chart.render(state.calibration, selectedBand, state.sampledPeaks, 20000, !calibrationTimer && !holdingCalibration);
  }
  const renderTiles = () => {
    tileList.replaceChildren();
    state.quickTiles.forEach((tile, index) => {
      const row = root.createElement('div');
      row.className = 'quick-save-tile';
      const label = root.createElement('span');
      label.textContent = `${tile.buffer === 'one' ? 'One-shot' : 'Looping'} · ${formatDuration(tile.seconds)}`;
      const remove = root.createElement('button');
      remove.type = 'button'; remove.className = 'tile-remove'; remove.textContent = 'Delete';
      remove.setAttribute('aria-label', `Delete ${label.textContent} tile`);
      remove.addEventListener('click', () => {
        state.quickTiles.splice(index, 1); renderTiles(); options.changed();
      });
      row.append(label, remove); tileList.append(row);
    });
    byId<HTMLButtonElement>('newQuickTile').disabled = state.quickTiles.length >= 8;
  };
  const render = () => {
    setSwitch('compressionSwitch', state.compression, 'compressionBody');
    setSwitch('silenceSwitch', state.skipSilence, 'silenceBody');
    setSwitch('notificationSwitch', state.notificationSave, 'notificationBody');
    setSwitch('autoStartSwitch', state.autoStart);
    compressionSlider.setValue(state.compressionLevel);
    byId('flacWarning').hidden = !state.compression || options.sampleFormat() === '16-bit integer';
    fitDial.setValue(state.calibrationFit);
    notificationWheel.setValue(state.notificationSeconds);
    renderCurve(); renderTiles();
  };
  const stopCalibration = (complete = false) => {
    if (calibrationTimer) options.clearTimeout(calibrationTimer);
    if (holdTimer) options.clearTimeout(holdTimer);
    calibrationTimer = 0; holdTimer = 0; holdingCalibration = false;
    measureButton.classList.remove('calibrating', 'calibrating-held');
    measureButton.textContent = 'Calibrate';
    fitDial.setEnabled(true);
    if (complete) {
      // A deterministic demonstration spectrum; this never requests or measures a microphone.
      state.sampledPeaks = Array.from({ length: 96 }, (_, index) => -76 + 8 * Math.sin(index * .21) + 3 * Math.cos(index * .67));
      state.calibration = sampledReverbSilencePoints(state.sampledPeaks, state.calibrationFit);
      selectedBand = Math.min(selectedBand, state.calibration.length - 1);
      byId('calibrationStatus').textContent = 'Sample calibration ready';
      options.changed();
    } else byId('calibrationStatus').textContent = 'Sample audio calibration';
    renderCurve();
  };
  const startCalibration = (held: boolean) => {
    if (calibrationTimer || holdingCalibration) return;
    holdingCalibration = held;
    measureButton.classList.add('calibrating');
    measureButton.classList.toggle('calibrating-held', held);
    measureButton.textContent = held ? 'Release to finish' : 'Cancel';
    byId('calibrationStatus').textContent = 'Measuring sample audio…';
    fitDial.setEnabled(false);
    if (!held) calibrationTimer = options.setTimeout(() => stopCalibration(true), 4000);
    renderCurve();
  };
  const toggle = (id: string, key: 'compression' | 'skipSilence' | 'notificationSave' | 'autoStart') => {
    byId(id).addEventListener('click', () => {
      state[key] = !state[key];
      if (key === 'skipSilence' && !state.skipSilence) stopCalibration();
      if (key === 'notificationSave' && !state.notificationSave) notificationWheel.cancelPointer();
      if (key === 'compression' && !state.compression) compressionSlider.cancelPointer();
      render(); options.changed();
    });
  };
  toggle('compressionSwitch', 'compression'); toggle('silenceSwitch', 'skipSilence');
  toggle('notificationSwitch', 'notificationSave'); toggle('autoStartSwitch', 'autoStart');
  measureButton.addEventListener('pointerdown', event => {
    if (event.button !== 0 || calibrationTimer || holdingCalibration) return;
    calibrationPointer = event.pointerId;
    suppressCalibrationClick = false;
    measureButton.setPointerCapture(event.pointerId);
    holdTimer = options.setTimeout(() => { holdTimer = 0; suppressCalibrationClick = true; startCalibration(true); }, 500);
  });
  const releaseCalibrationPointer = (complete: boolean) => {
    if (holdTimer) options.clearTimeout(holdTimer);
    holdTimer = 0;
    const previous = calibrationPointer;
    calibrationPointer = -1;
    if (previous !== -1 && measureButton.hasPointerCapture(previous)) measureButton.releasePointerCapture(previous);
    if (holdingCalibration) stopCalibration(complete);
  };
  measureButton.addEventListener('pointerup', () => releaseCalibrationPointer(true));
  measureButton.addEventListener('pointercancel', () => { suppressCalibrationClick = true; releaseCalibrationPointer(false); });
  measureButton.addEventListener('lostpointercapture', () => { if (calibrationPointer !== -1) releaseCalibrationPointer(false); });
  measureButton.addEventListener('click', () => {
    if (suppressCalibrationClick) { suppressCalibrationClick = false; return; }
    if (calibrationTimer) stopCalibration(); else startCalibration(false);
  });
  const selectTileBuffer = (value: 'one' | 'loop') => {
    tileBuffer = value;
    root.querySelectorAll<HTMLButtonElement>('[data-tile-buffer]').forEach(button => {
      const selected = button.dataset.tileBuffer === value;
      button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
    });
  };
  byId('newQuickTile').addEventListener('click', () => {
    tileEditor.hidden = false; byId('newQuickTile').hidden = true;
    selectTileBuffer('loop'); tileWheel.setValue(120);
    tileEditor.querySelector<HTMLElement>('[data-tile-buffer="loop"]')?.focus({ preventScroll: true });
  });
  const closeTileEditor = (restoreFocus = true) => {
    tileWheel.cancelPointer(); tileEditor.hidden = true; byId('newQuickTile').hidden = false;
    if (restoreFocus) byId('newQuickTile').focus({ preventScroll: true });
  };
  byId('cancelQuickTile').addEventListener('click', () => closeTileEditor());
  root.querySelectorAll<HTMLButtonElement>('[data-tile-buffer]').forEach(button => {
    button.addEventListener('click', () => selectTileBuffer(button.dataset.tileBuffer === 'loop' ? 'loop' : 'one'));
  });
  byId('saveQuickTile').addEventListener('click', () => {
    if (state.quickTiles.length >= 8) return;
    state.quickTiles.push({ buffer: tileBuffer, seconds: tileWheel.getValue() });
    renderTiles(); closeTileEditor(); options.changed();
  });
  const cancelPointer = () => {
    chart.cancelPointer(); fitDial.cancelPointer(); compressionSlider.cancelPointer();
    notificationWheel.cancelPointer(); tileWheel.cancelPointer(); releaseCalibrationPointer(false);
  };
  render();
  return {
    snapshot(): ReverbSettingsExtras { return structuredClone(state); },
    restore(value: ReverbSettingsExtras) { stopCalibration(); state = structuredClone(value); render(); closeTileEditor(false); },
    refresh: render,
    valid: () => state.notificationSeconds >= 1 && state.notificationSeconds <= 86400 && !notificationWheel.isInteracting() && !tileWheel.isInteracting(),
    cancelPointer,
    dispose() {
      cancelPointer(); stopCalibration(); chart.dispose(); fitDial.dispose(); compressionSlider.dispose();
      notificationWheel.dispose(); tileWheel.dispose();
    },
  };
}
