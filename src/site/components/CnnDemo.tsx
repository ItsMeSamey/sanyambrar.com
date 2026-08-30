import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';

export type CnnInference = (input: Float32Array) => ArrayLike<number>;

const INPUT_SIZE = 28;
const DRAW_SIZE = 280;
const OUTPUTS = ['0','1','2','3','4','5','6','7','8','9','?'] as const;
const DEFAULT_INK = 0.72;

function emptyScores(): Array<number | null> {
  return Array.from({ length: OUTPUTS.length }, () => null);
}

function normalizedScores(values: ArrayLike<number>): number[] | null {
  if (values.length !== OUTPUTS.length) return null;
  const scores = Array.from(values, value => Number.isFinite(value) ? Math.max(0, Number(value)) : 0);
  const total = scores.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return scores;
  return scores.map(value => value / total);
}

export function CnnDemo(props: { infer?: CnnInference }) {
  let canvas!: HTMLCanvasElement;
  let sampleCanvas!: HTMLCanvasElement;
  let drawing = false;
  let lastX = 0;
  let lastY = 0;
  let inferenceFrame = 0;
  const [scores, setScores] = createSignal<Array<number | null>>(emptyScores());
  const [hasInk, setHasInk] = createSignal(false);
  const [modelError, setModelError] = createSignal(false);
  const [inkLevel, setInkLevel] = createSignal(DEFAULT_INK);

  const context = () => canvas.getContext('2d', { willReadFrequently: true })!;
  const sampleContext = () => sampleCanvas.getContext('2d', { willReadFrequently: true })!;
  const model = () => props.infer ?? (globalThis as typeof globalThis & { __sameyCnnInfer?: CnnInference }).__sameyCnnInfer;

  const themeInk = () => {
    const style = getComputedStyle(document.documentElement);
    return style.getPropertyValue('--site-accent').trim() || style.getPropertyValue('--site-fg').trim() || '#777';
  };

  const applyBrush = () => {
    const ctx = context();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = inkLevel();
    ctx.fillStyle = themeInk();
    ctx.strokeStyle = themeInk();
    ctx.lineWidth = 19;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const recolorForTheme = () => {
    const ctx = context();
    if (hasInk()) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-in';
      ctx.globalAlpha = 1;
      ctx.fillStyle = themeInk();
      ctx.fillRect(0, 0, DRAW_SIZE, DRAW_SIZE);
      ctx.restore();
    }
    applyBrush();
  };

  const point = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * DRAW_SIZE / rect.width,
      y: (event.clientY - rect.top) * DRAW_SIZE / rect.height,
    };
  };

  const extractInput = () => {
    const ctx = sampleContext();
    ctx.clearRect(0, 0, INPUT_SIZE, INPUT_SIZE);
    ctx.drawImage(canvas, 0, 0, INPUT_SIZE, INPUT_SIZE);
    const rgba = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
    const input = new Float32Array(INPUT_SIZE * INPUT_SIZE);
    // Alpha is the model grayscale channel. A translucent stroke is a real
    // intermediate value, and overlapping strokes naturally accumulate.
    for (let i = 0; i < input.length; i++) input[i] = rgba[i * 4 + 3] / 255;
    return input;
  };

  const infer = () => {
    inferenceFrame = 0;
    if (!hasInk()) {
      sampleContext().clearRect(0, 0, INPUT_SIZE, INPUT_SIZE);
      setScores(emptyScores());
      setModelError(false);
      return;
    }
    const input = extractInput();
    const inference = model();
    if (!inference) {
      setScores(emptyScores());
      setModelError(false);
      return;
    }
    try {
      const raw = inference(input);
      const next = normalizedScores(raw);
      if (!next) throw new Error(`CNN inference returned ${raw.length} outputs; expected ${OUTPUTS.length}`);
      setScores(next);
      setModelError(false);
    } catch (error) {
      console.error('CNN demo inference failed', error);
      setScores(emptyScores());
      setModelError(true);
    }
  };

  const queueInference = () => {
    if (!inferenceFrame) inferenceFrame = requestAnimationFrame(infer);
  };

  const beginStroke = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    const p = point(event);
    drawing = true;
    lastX = p.x;
    lastY = p.y;
    applyBrush();
    const ctx = context();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9.5, 0, Math.PI * 2);
    ctx.fill();
    setHasInk(true);
    queueInference();
  };

  const moveStroke = (event: PointerEvent) => {
    if (!drawing) return;
    event.preventDefault();
    const p = point(event);
    applyBrush();
    const ctx = context();
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastX = p.x;
    lastY = p.y;
    setHasInk(true);
    queueInference();
  };

  const endStroke = (event: PointerEvent) => {
    if (!drawing) return;
    drawing = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    queueInference();
  };

  const clear = () => {
    drawing = false;
    const ctx = context();
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, DRAW_SIZE, DRAW_SIZE);
    ctx.restore();
    sampleContext().clearRect(0, 0, INPUT_SIZE, INPUT_SIZE);
    setHasInk(false);
    setScores(emptyScores());
    setModelError(false);
    applyBrush();
  };

  const winner = () => {
    const values = scores();
    let best = -1;
    let bestScore = -1;
    for (let i = 0; i < values.length; i++) {
      const score = values[i];
      if (score != null && score > bestScore) {
        best = i;
        bestScore = score;
      }
    }
    return best < 0 ? null : { label: OUTPUTS[best], score: bestScore };
  };

  const onInkInput = (event: InputEvent & { currentTarget: HTMLInputElement }) => {
    setInkLevel(Number(event.currentTarget.value) / 100);
    applyBrush();
  };

  onMount(() => {
    canvas.width = DRAW_SIZE;
    canvas.height = DRAW_SIZE;
    sampleCanvas.width = INPUT_SIZE;
    sampleCanvas.height = INPUT_SIZE;
    applyBrush();
    window.addEventListener('samey-themechange', recolorForTheme);
  });

  onCleanup(() => {
    if (inferenceFrame) cancelAnimationFrame(inferenceFrame);
    window.removeEventListener('samey-themechange', recolorForTheme);
  });

  return <section class="detail-copy cnn-demo-section" aria-labelledby="cnn-demo-title">
    <div class="cnn-demo-head">
      <div>
        <p class="cnn-demo-kicker">Browser inference</p>
        <h2 id="cnn-demo-title">Draw something</h2>
        <p>Sketch a digit, symbol, or noise. The pad preserves grayscale intensity before 28 × 28 inference.</p>
      </div>
      <div class="cnn-demo-status" data-state={modelError() ? 'error' : model() ? 'ready' : 'pending'}>
        <span class="cnn-demo-status-dot" aria-hidden="true" />
        {modelError() ? 'INFERENCE ERROR' : model() ? 'WASM CONNECTED' : 'WASM HOOK READY'}
      </div>
    </div>

    <div class="cnn-demo-shell">
      <div class="cnn-draw-pane">
        <div class="cnn-pad-wrap">
          <div class="cnn-pad-glow" aria-hidden="true" />
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
          <Show when={!hasInk()}>
            <div class="cnn-pad-empty" aria-hidden="true">
              <span>DRAW</span>
              <small>0–9, symbols, greys, noise</small>
            </div>
          </Show>
        </div>

        <div class="cnn-pad-footer">
          <div class="cnn-input-preview">
            <div class="cnn-input-thumb"><canvas ref={sampleCanvas} class="cnn-sample-canvas" aria-hidden="true" /></div>
            <div class="cnn-input-meta"><span>MODEL INPUT</span><strong>28 × 28 · FLOAT32</strong></div>
          </div>

          <label class="cnn-ink-control">
            <span><b>INTENSITY</b><output>{Math.round(inkLevel() * 100)}%</output></span>
            <input
              class="cnn-ink-range"
              type="range"
              min="10"
              max="100"
              step="2"
              value={Math.round(inkLevel() * 100)}
              aria-label="Drawing intensity"
              style={`--cnn-ink:${Math.round(inkLevel() * 100)}%`}
              onInput={onInkInput}
            />
          </label>

          <button type="button" class="cnn-clear" onClick={clear} disabled={!hasInk()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg>
            Clear
          </button>
        </div>
      </div>

      <div class="cnn-output-pane">
        <div class="cnn-output-summary">
          <div>
            <span class="cnn-output-label">PREDICTION</span>
            <strong>{winner()?.label ?? '—'}</strong>
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
          <span>11-way softmax</span>
          <span class="cnn-unknown-key"><b>?</b> unknown</span>
        </div>
      </div>
    </div>
  </section>;
}
