import { batch, createSignal, For, onCleanup, onMount } from 'solid-js';

const INPUT_SIZE = 28;
const DRAW_SIZE = 280;
const OUTPUTS = ['0','1','2','3','4','5','6','7','8','9','?'] as const;
const DEFAULT_INK = 0.72;

type WorkerMessage =
  | { type: 'ready' }
  | { type: 'result'; id: number; classId: number; probabilities: number[] }
  | { type: 'error'; id?: number; message: string };

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
  let inkPresent = false;
  let lastX = 0;
  let lastY = 0;
  let inferenceFrame = 0;
  let inferenceBusy = false;
  let inferenceDirty = false;
  let workerReady = false;
  let requestId = 0;
  let activeRequestId = 0;
  let contentEpoch = 0;
  let activeRequestEpoch = 0;
  let disposed = false;

  const [scores, setScores] = createSignal<Array<number | null>>(emptyScores());
  const [predictedClass, setPredictedClass] = createSignal<number | null>(null);
  const [hasInk, setHasInk] = createSignal(false);
  const [inkLevel, setInkLevel] = createSignal(DEFAULT_INK);

  const readThemeInk = () => {
    const style = getComputedStyle(document.documentElement);
    inkColor = style.getPropertyValue('--site-accent').trim() || style.getPropertyValue('--site-fg').trim() || '#777';
  };

  const configureBrush = () => {
    drawContext.globalCompositeOperation = 'source-over';
    drawContext.globalAlpha = inkLevel();
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

  const extractInput = () => {
    sampleContext.clearRect(0, 0, INPUT_SIZE, INPUT_SIZE);
    sampleContext.drawImage(canvas, 0, 0, INPUT_SIZE, INPUT_SIZE);
    const rgba = sampleContext.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
    const input = new Uint8Array(INPUT_SIZE * INPUT_SIZE);
    for (let i = 0; i < input.length; i++) input[i] = rgba[i * 4 + 3];
    return input;
  };

  const clearResult = () => batch(() => {
    setScores(emptyScores());
    setPredictedClass(null);
  });

  const inferLatest = () => {
    inferenceFrame = 0;
    if (!worker || !workerReady || inferenceBusy || !inferenceDirty || !inkPresent) return;
    inferenceDirty = false;
    const id = ++requestId;
    activeRequestId = id;
    activeRequestEpoch = contentEpoch;
    inferenceBusy = true;
    const input = extractInput();
    worker.postMessage({ type: 'predict', id, input }, [input.buffer as ArrayBuffer]);
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
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
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
    if (!drawing) return;
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
    if (!drawing) return;
    drawing = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    queueInference();
  };

  const clear = () => {
    drawing = false;
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
    setInkLevel(Number(event.currentTarget.value) / 100);
    configureBrush();
  };

  const inkFill = () => {
    const ratio = Math.max(0, Math.min(1, (inkLevel() * 100 - 10) / 90));
    return `calc(${ratio * 100}% + ${8 - ratio * 16}px)`;
  };

  onMount(() => {
    canvas.width = DRAW_SIZE;
    canvas.height = DRAW_SIZE;
    // The visible canvas is draw-only. Keeping willReadFrequently off lets
    // Chromium retain its accelerated Android path; only the tiny 28x28
    // sampling canvas needs frequent CPU reads.
    drawContext = canvas.getContext('2d', { desynchronized: true })!;
    sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = INPUT_SIZE;
    sampleCanvas.height = INPUT_SIZE;
    sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true })!;
    readThemeInk();
    configureBrush();
    window.addEventListener('samey-themechange', recolorForTheme);
    resizeObserver = new ResizeObserver(() => { canvasRect = null; });
    resizeObserver.observe(canvas);

    worker = new Worker('/cnn-worker.js');
    worker.addEventListener('message', event => {
      if (disposed) return;
      const message = event.data as WorkerMessage;
      if (message.type === 'ready') {
        workerReady = true;
        if (inferenceDirty && inkPresent) queueInference();
        return;
      }
      if (message.type === 'result') {
        inferenceBusy = false;
        const next = validScores(message.probabilities);
        if (!next || message.classId < 0 || message.classId >= OUTPUTS.length) {
          console.error('CNN worker returned an invalid result');
          if (message.id === activeRequestId && activeRequestEpoch === contentEpoch) clearResult();
        } else if (message.id === activeRequestId && activeRequestEpoch === contentEpoch && inkPresent) {
          // Show every completed prediction even if a newer canvas state is
          // already dirty. The next inference immediately catches up instead
          // of hiding useful in-flight results until drawing stops.
          batch(() => {
            setScores(next);
            setPredictedClass(message.classId);
          });
        }
        if (inferenceDirty && inkPresent) queueInference();
        return;
      }
      inferenceBusy = false;
      if (message.id == null) workerReady = false;
      if (message.id == null || (message.id === activeRequestId && activeRequestEpoch === contentEpoch)) clearResult();
      console.error('CNN worker failed', message.message);
      if (inferenceDirty && inkPresent) queueInference();
    });
    worker.addEventListener('error', error => {
      if (disposed) return;
      workerReady = false;
      inferenceBusy = false;
      inferenceDirty = false;
      clearResult();
      console.error('CNN worker crashed', error);
    });
  });

  onCleanup(() => {
    disposed = true;
    contentEpoch++;
    inferenceDirty = false;
    if (inferenceFrame) cancelAnimationFrame(inferenceFrame);
    resizeObserver?.disconnect();
    worker?.terminate();
    window.removeEventListener('samey-themechange', recolorForTheme);
  });

  return <section class="cnn-demo-section" aria-labelledby="cnn-demo-title">
    <div class="cnn-demo-head"><h2 id="cnn-demo-title">Draw something</h2></div>

    <div class="cnn-demo-shell">
      <div class="cnn-draw-pane">
        <div class="cnn-pad-wrap">
          <div class="cnn-pad-grid" aria-hidden="true" />
          <canvas
            ref={canvas}
            class="cnn-pad"
            aria-label="Draw a digit or unknown symbol"
            onPointerDown={beginStroke}
            onPointerMove={moveStroke}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
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
            <b>{winner() ? `${Math.round(winner()!.score * 100)}%` : '—'}</b>
          </div>
        </div>

        <div class="cnn-probabilities" aria-label="Class probabilities">
          <For each={OUTPUTS}>{(label, index) => {
            const score = () => scores()[index()];
            return <div class="cnn-probability-row" data-leading={winner()?.label === label ? 'true' : 'false'}>
              <span class="cnn-class" title={label === '?' ? 'Unknown symbol' : `Digit ${label}`}>{label}</span>
              <div class="cnn-meter" aria-hidden="true"><i style={{ width: `${(score() ?? 0) * 100}%` }} /></div>
              <span class="cnn-percent">{score() == null ? '—' : `${(score()! * 100).toFixed(score()! >= .1 ? 1 : 2)}%`}</span>
            </div>;
          }}</For>
        </div>
        <div class="cnn-output-foot">
          <span class="cnn-unknown-key"><b>?</b> unknown</span>
        </div>
      </div>
    </div>
  </section>;
}
