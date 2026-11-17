import { createSignal, For, Show, onCleanup, onSettled } from 'solid-js';
import { formatThrownError } from '../../shared/error.ts';
import { afterVisualTransition } from '../../shared/afterVisualTransition.ts';
import CnnWorker from '../workers/cnn-worker.ts?worker';

let warmWorkerTask: Promise<void> | undefined;
export function preloadCnnDemoAssets(): Promise<void> {
  if (warmWorkerTask) return warmWorkerTask;
  if (typeof Worker === 'undefined') return Promise.resolve();
  warmWorkerTask = new Promise<void>(resolve => {
    const worker = new CnnWorker();
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      worker.terminate();
      resolve();
    };
    const timeout = setTimeout(done, 5000);
    worker.addEventListener('message', event => {
      const message = event.data as { type?: unknown };
      if (message?.type === 'ready' || message?.type === 'error') done();
    });
    worker.addEventListener('error', done, { once: true });
  });
  return warmWorkerTask;
}

const INPUT_SIZE = 28;
const DRAW_SIZE = 280;
const OUTPUTS = ['0','1','2','3','4','5','6','7','8','9','?'] as const;
const DEFAULT_INK = 0.72;
const WORKER_STARTUP_TIMEOUT = 15_000;

type WorkerMessage =
  | { type: 'ready' }
  | { type: 'result'; id: number; classId: number; probabilities: number[] }
  | { type: 'error'; id?: number; message: string; detail: string };

type UnknownRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is UnknownRecord => value !== null && typeof value === 'object' && !Array.isArray(value);
const isWorkerMessage = (value: unknown): value is WorkerMessage => {
  if (!isRecord(value) || typeof value.type !== 'string') return false;
  if (value.type === 'ready') return true;
  if (value.type === 'result') return typeof value.id === 'number' && Number.isInteger(value.id)
    && typeof value.classId === 'number' && Number.isInteger(value.classId)
    && Array.isArray(value.probabilities) && value.probabilities.every(score => typeof score === 'number');
  return value.type === 'error' && (value.id === undefined || typeof value.id === 'number' && Number.isInteger(value.id))
    && typeof value.message === 'string' && typeof value.detail === 'string';
};


function emptyScores(): Array<number | null> {
  return Array.from({ length: OUTPUTS.length }, () => null);
}

function validScores(values: ArrayLike<number>): number[] | null {
  if (values.length !== OUTPUTS.length) return null;
  return Array.from(values, value => Number.isFinite(value) ? Math.max(0, Number(value)) : 0);
}

export function CnnDemo() {
  let canvas!: HTMLCanvasElement;
  let sampleCanvas!: HTMLCanvasElement;
  let drawContext!: CanvasRenderingContext2D;
  let sampleContext!: CanvasRenderingContext2D;
  let worker: Worker | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let canvasRect: DOMRect | null = null;
  let inkColor = '#777';
  let drawing = false;
  let activePointerId: number | null = null;
  let inkPresent = false;
  let lastX = 0;
  let lastY = 0;
  let inferenceFrame = 0;
  let inferenceBusy = false;
  let inferenceDirty = false;
  let workerReady = false;
  let startupTimeout: ReturnType<typeof setTimeout> | undefined;
  let requestId = 0;
  let activeRequestId = 0;
  let contentEpoch = 0;
  let activeRequestEpoch = 0;
  let disposed = false;
  let initialized = false;
  let cancelSetup = () => {};

  const [scores, setScores] = createSignal<Array<number | null>>(emptyScores());
  const [predictedClass, setPredictedClass] = createSignal<number | null>(null);
  const [hasInk, setHasInk] = createSignal(false);
  const [inkLevel, setInkLevel] = createSignal(DEFAULT_INK);
  const [workerFailure, setWorkerFailure] = createSignal<string | null>(null);
  const [modelLoading, setModelLoading] = createSignal(true);
  const [ready, setReady] = createSignal(false);

  const readThemeInk = () => {
    const style = getComputedStyle(document.documentElement);
    inkColor = style.getPropertyValue('--site-accent').trim() || style.getPropertyValue('--site-fg').trim() || '#777';
  };

  const configureBrush = (level = inkLevel()) => {
    drawContext.globalCompositeOperation = 'source-over';
    drawContext.globalAlpha = level;
    drawContext.fillStyle = inkColor;
    drawContext.strokeStyle = inkColor;
    drawContext.lineWidth = 19;
    drawContext.lineCap = 'round';
    drawContext.lineJoin = 'round';
  };

  const recolorForTheme = () => {
    readThemeInk();
    if (inkPresent) {
      drawContext.save();
      drawContext.globalCompositeOperation = 'source-in';
      drawContext.globalAlpha = 1;
      drawContext.fillStyle = inkColor;
      drawContext.fillRect(0, 0, DRAW_SIZE, DRAW_SIZE);
      drawContext.restore();
    }
    configureBrush();
  };

  const point = (event: PointerEvent) => {
    const rect = canvasRect ?? (canvasRect = canvas.getBoundingClientRect());
    return {
      x: (event.clientX - rect.left) * DRAW_SIZE / rect.width,
      y: (event.clientY - rect.top) * DRAW_SIZE / rect.height,
    };
  };
  const invalidateCanvasRect = () => { canvasRect = null; };

  const extractInput = () => {
    sampleContext.clearRect(0, 0, INPUT_SIZE, INPUT_SIZE);
    sampleContext.drawImage(canvas, 0, 0, INPUT_SIZE, INPUT_SIZE);
    const rgba = sampleContext.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
    const input = new Uint8Array(INPUT_SIZE * INPUT_SIZE);
    for (let i = 0; i < input.length; i++) input[i] = rgba[i * 4 + 3];
    return input;
  };

  const clearResult = () => {
    setScores(emptyScores());
    setPredictedClass(null);
  };

  const inferLatest = () => {
    inferenceFrame = 0;
    if (!worker || !workerReady || inferenceBusy || !inferenceDirty || !inkPresent) return;
    inferenceDirty = false;
    const id = ++requestId;
    activeRequestId = id;
    activeRequestEpoch = contentEpoch;
    inferenceBusy = true;
    const input = extractInput();
    worker.postMessage({ type: 'predict', id, input }, input.buffer instanceof ArrayBuffer ? [input.buffer] : []);
  };

  const queueInference = () => {
    inferenceDirty = true;
    if (workerReady && !inferenceBusy && !inferenceFrame && inkPresent) {
      inferenceFrame = requestAnimationFrame(inferLatest);
    }
  };

  const markInkChanged = () => {
    if (!inkPresent) {
      inkPresent = true;
      setHasInk(true);
    }
    queueInference();
  };

  const beginStroke = (event: PointerEvent) => {
    if (!initialized || activePointerId != null || event.button !== 0) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    activePointerId = event.pointerId;
    canvasRect = canvas.getBoundingClientRect();
    const p = point(event);
    drawing = true;
    lastX = p.x;
    lastY = p.y;
    drawContext.beginPath();
    drawContext.arc(p.x, p.y, 9.5, 0, Math.PI * 2);
    drawContext.fill();
    markInkChanged();
  };

  const moveStroke = (event: PointerEvent) => {
    if (!drawing || event.pointerId !== activePointerId) return;
    event.preventDefault();
    const samples = event.getCoalescedEvents?.() ?? [];
    const events = samples.length ? samples : [event];
    drawContext.beginPath();
    drawContext.moveTo(lastX, lastY);
    for (const sample of events) {
      const p = point(sample);
      drawContext.lineTo(p.x, p.y);
      lastX = p.x;
      lastY = p.y;
    }
    drawContext.stroke();
    markInkChanged();
  };

  const endStroke = (event: PointerEvent) => {
    if (!drawing || event.pointerId !== activePointerId) return;
    drawing = false;
    activePointerId = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    queueInference();
  };

  const loseStrokeCapture = (event: PointerEvent) => {
    if (event.pointerId !== activePointerId) return;
    drawing = false;
    activePointerId = null;
    queueInference();
  };

  const cancelStroke = () => {
    const pointerId = activePointerId;
    if (!drawing && pointerId == null) return;
    drawing = false;
    activePointerId = null;
    if (pointerId != null && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    queueInference();
  };

  const clear = () => {
    if (!initialized) return;
    if (activePointerId != null && canvas.hasPointerCapture(activePointerId)) {
      canvas.releasePointerCapture(activePointerId);
    }
    drawing = false;
    activePointerId = null;
    inkPresent = false;
    contentEpoch++;
    inferenceDirty = false;
    if (inferenceFrame) {
      cancelAnimationFrame(inferenceFrame);
      inferenceFrame = 0;
    }
    drawContext.save();
    drawContext.globalAlpha = 1;
    drawContext.clearRect(0, 0, DRAW_SIZE, DRAW_SIZE);
    drawContext.restore();
    sampleContext.clearRect(0, 0, INPUT_SIZE, INPUT_SIZE);
    setHasInk(false);
    clearResult();
    configureBrush();
  };

  const winner = () => {
    const classId = predictedClass();
    if (classId == null) return null;
    const score = scores()[classId];
    return score == null ? null : { label: OUTPUTS[classId], score };
  };

  const onInkInput = (event: InputEvent & { currentTarget: HTMLInputElement }) => {
    if (!initialized) return;
    const level = Number(event.currentTarget.value) / 100;
    setInkLevel(level);
    configureBrush(level);
  };

  const inkFill = () => {
    const ratio = Math.max(0, Math.min(1, (inkLevel() * 100 - 10) / 90));
    return `calc(${ratio * 100}% + ${8 - ratio * 16}px)`;
  };

  const clearStartupTimeout = () => {
    clearTimeout(startupTimeout);
    startupTimeout = undefined;
  };

  const stopWorker = () => {
    clearStartupTimeout();
    const previous = worker;
    worker = undefined;
    previous?.terminate();
    workerReady = false;
    inferenceBusy = false;
    if (inferenceFrame) cancelAnimationFrame(inferenceFrame);
    inferenceFrame = 0;
  };

  const failWorker = (detail: string) => {
    stopWorker();
    invalidateCanvasRect();
    setModelLoading(false);
    clearResult();
    setWorkerFailure(detail);
    console.error('CNN worker failed', detail);
  };

  const startWorker = () => {
    if (disposed || !initialized) return;
    stopWorker();
    invalidateCanvasRect();
    clearResult();
    setWorkerFailure(null);
    setModelLoading(true);
    inferenceDirty = inkPresent;
    try {
      const attempt = new CnnWorker();
      worker = attempt;
      startupTimeout = setTimeout(() => {
        if (disposed || worker !== attempt) return;
        failWorker('The model took too long to load. Retry to predict your current drawing.');
      }, WORKER_STARTUP_TIMEOUT);
      attempt.addEventListener('message', event => {
        if (disposed || worker !== attempt) return;
        const message: unknown = event.data;
        if (!isWorkerMessage(message)) {
          failWorker('CNN worker returned an invalid protocol message');
          return;
        }
        if (message.type === 'ready') {
          clearStartupTimeout();
          invalidateCanvasRect();
          workerReady = true;
          setModelLoading(false);
          setWorkerFailure(null);
          if (inferenceDirty && inkPresent) queueInference();
          return;
        }
        if (message.type === 'result') {
          if (!workerReady || message.id !== activeRequestId) return;
          inferenceBusy = false;
          const next = validScores(message.probabilities);
          if (!next || message.classId < 0 || message.classId >= OUTPUTS.length) {
            failWorker(`CNN worker returned an invalid result for request ${message.id}`);
            return;
          }
          if (activeRequestEpoch === contentEpoch && inkPresent) {
            // Show completed predictions while the next inference catches up
            // with any strokes drawn during this request.
            setWorkerFailure(null);
            setScores(next);
            setPredictedClass(message.classId);
          }
          if (inferenceDirty && inkPresent) queueInference();
          return;
        }
        if (message.id == null || message.id === activeRequestId) failWorker(message.detail);
      });
      attempt.addEventListener('error', error => {
        if (disposed || worker !== attempt) return;
        const rawError = (error as unknown as { error?: unknown }).error;
        const failure: unknown = rawError ?? new Error(`CNN worker crashed: ${error.message || 'unknown worker error'}`);
        failWorker(formatThrownError(failure));
      });
    } catch (error) {
      failWorker(formatThrownError(error));
    }
  };

  onSettled(() => {
    cancelSetup = afterVisualTransition(() => {
      if (disposed || !canvas.isConnected) return;
      try {
      canvas.width = DRAW_SIZE;
      canvas.height = DRAW_SIZE;
      // The visible canvas is draw-only. Keeping willReadFrequently off lets
      // Chromium retain its accelerated Android path; only the tiny 28x28
      // sampling canvas needs frequent CPU reads.
      const visibleContext = canvas.getContext('2d', { desynchronized: true });
      if (!visibleContext) throw new Error('CNN drawing canvas is unavailable');
      drawContext = visibleContext;
      sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = INPUT_SIZE;
      sampleCanvas.height = INPUT_SIZE;
      const samplingContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
      if (!samplingContext) throw new Error('CNN sampling canvas is unavailable');
      sampleContext = samplingContext;
      readThemeInk();
      configureBrush();
      window.addEventListener('samey-themechange', recolorForTheme);
      window.addEventListener('blur', cancelStroke);
      window.addEventListener('scroll', invalidateCanvasRect, true);
      resizeObserver = new ResizeObserver(invalidateCanvasRect);
      resizeObserver.observe(canvas);

      initialized = true;
      setReady(true);
      canvas.toggleAttribute('data-cnn-runtime-ready', true);
      startWorker();
      } catch (error) {
        resizeObserver?.disconnect();
        stopWorker();
        window.removeEventListener('samey-themechange', recolorForTheme);
        window.removeEventListener('blur', cancelStroke);
        window.removeEventListener('scroll', invalidateCanvasRect, true);
        setModelLoading(false);
        setWorkerFailure(formatThrownError(error));
      }
    });
  });

  onCleanup(() => {
    disposed = true;
    initialized = false;
    cancelSetup();
    canvas?.removeAttribute('data-cnn-runtime-ready');
    contentEpoch++;
    inferenceDirty = false;
    if (inferenceFrame && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(inferenceFrame);
    resizeObserver?.disconnect();
    stopWorker();
    if (typeof window !== 'undefined') {
      window.removeEventListener('samey-themechange', recolorForTheme);
      window.removeEventListener('blur', cancelStroke);
      window.removeEventListener('scroll', invalidateCanvasRect, true);
    }
  });

  return <section class="cnn-demo-section" aria-labelledby="cnn-demo-title">
    <div class="cnn-demo-head"><h2 id="cnn-demo-title">Draw a digit</h2></div>

    <div class="cnn-demo-shell">
      <div class="cnn-draw-pane">
        <div class="cnn-pad-wrap">
          <div class="cnn-pad-grid" aria-hidden="true" />
          <canvas
            ref={canvas}
            class="cnn-pad"
            aria-label="Draw a digit or unknown symbol"
            aria-disabled={ready() ? 'false' : 'true'}
            onPointerDown={beginStroke}
            onPointerMove={moveStroke}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            onLostPointerCapture={loseStrokeCapture}
          />
        </div>

        <div class="cnn-controls-row">
          <label class="game-settings-slider cnn-ink-control" style={`--range-fill-width:${inkFill()}`}>
            <span class="game-settings-slider-head">
              <span class="game-settings-slider-label">Intensity</span>
              <output class="game-settings-slider-value">{Math.round(inkLevel() * 100)}%</output>
            </span>
            <span class="game-range-shell">
              <span class="game-range-track" aria-hidden="true"><span class="game-range-fill" /></span>
              <input
                type="range"
                min="10"
                max="100"
                step="2"
                value={Math.round(inkLevel() * 100)}
                aria-label="Drawing intensity"
                disabled={!ready()}
                onInput={onInkInput}
              />
            </span>
          </label>

          <button type="button" class="game-settings-action cnn-clear" onClick={clear} disabled={!hasInk()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg>
            Clear
          </button>
        </div>
      </div>

      <div class="cnn-output-pane">
        <div class="cnn-output-summary">
          <div>
            <span class="cnn-output-label">PREDICTION</span>
            <strong class="cnn-prediction">{winner()?.label ?? '—'}</strong>
          </div>
          <div class="cnn-confidence">
            <span>CONFIDENCE</span>
            <b>{(() => { const result = winner(); return result ? `${Math.round(result.score * 100)}%` : '—'; })()}</b>
          </div>
        </div>

        <div class="cnn-probabilities" aria-label="Class probabilities">
          <For each={OUTPUTS}>{(label, index) => {
            const score = () => scores()[index()];
            return <div class="cnn-probability-row" data-leading={winner()?.label === label ? 'true' : 'false'}>
              <span class="cnn-class" title={label === '?' ? 'Unknown symbol' : `Digit ${label}`}>{label}</span>
              <div class="cnn-meter" aria-hidden="true"><i style={{ width: `${(score() ?? 0) * 100}%` }} /></div>
              <span class="cnn-percent">{(() => { const value = score(); return value == null ? '—' : `${(value * 100).toFixed(value >= .1 ? 1 : 2)}%`; })()}</span>
            </div>;
          }}</For>
        </div>
        <div class="cnn-output-foot">
          <span class="cnn-unknown-key"><b>?</b> unknown</span>
        </div>
      </div>
    </div>
    <Show when={modelLoading()}><p class="cnn-demo-status" role="status">{ready() ? 'Loading model…' : 'Preparing drawing canvas…'}</p></Show>
    <Show when={workerFailure()}>{detail =>
      <aside class="cnn-demo-error" role="alert" aria-live="assertive">
        <strong>{ready() ? 'Prediction unavailable' : 'Drawing unavailable'}</strong>
        <details><summary>Error details</summary><pre class="samey-error-stack">{detail()}</pre></details>
        <Show when={ready()} fallback={<button type="button" onClick={() => location.reload()}>Reload page</button>}>
          <button type="button" onClick={startWorker}>Retry model</button>
        </Show>
      </aside>
    }</Show>
  </section>;
}
