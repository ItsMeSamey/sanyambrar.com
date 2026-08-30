import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';

const INPUT_SIZE = 28;
const DRAW_SIZE = 280;
const OUTPUTS = ['0','1','2','3','4','5','6','7','8','9','?'] as const;
const DEFAULT_INK = 0.72;

function emptyScores(): Array<number | null> {
  return Array.from({ length: OUTPUTS.length }, () => null);
}

function validScores(values: ArrayLike<number>): number[] | null {
  if (values.length !== OUTPUTS.length) return null;
  return Array.from(values, value => Number.isFinite(value) ? Math.max(0, Number(value)) : 0);
}

type CnnWasm = {
  memory: WebAssembly.Memory;
  image_ptr(): number;
  probabilities_ptr(): number;
  predict(): number;
  class_count(): number;
  unknown_class(): number;
};

type ModelState = 'loading' | 'ready' | 'error';

async function loadCnnWasm(): Promise<CnnWasm> {
  const response = await fetch('/cnn.wasm');
  if (!response.ok) throw new Error(`cnn.wasm: HTTP ${response.status}`);

  let result: WebAssembly.WebAssemblyInstantiatedSource;
  try {
    result = await WebAssembly.instantiateStreaming(response.clone());
  } catch {
    result = await WebAssembly.instantiate(await response.arrayBuffer());
  }

  const wasm = result.instance.exports as unknown as CnnWasm;
  if (!(wasm.memory instanceof WebAssembly.Memory) ||
      typeof wasm.image_ptr !== 'function' || typeof wasm.probabilities_ptr !== 'function' ||
      typeof wasm.predict !== 'function' || typeof wasm.class_count !== 'function' ||
      typeof wasm.unknown_class !== 'function') {
    throw new Error('cnn.wasm has an incompatible ABI');
  }
  if (wasm.class_count() !== OUTPUTS.length || wasm.unknown_class() !== OUTPUTS.indexOf('?')) {
    throw new Error(`cnn.wasm metadata mismatch: ${wasm.class_count()} classes, unknown=${wasm.unknown_class()}`);
  }
  return wasm;
}

export function CnnDemo() {
  let canvas!: HTMLCanvasElement;
  let sampleCanvas!: HTMLCanvasElement;
  let drawing = false;
  let lastX = 0;
  let lastY = 0;
  let inferenceFrame = 0;
  const [scores, setScores] = createSignal<Array<number | null>>(emptyScores());
  const [predictedClass, setPredictedClass] = createSignal<number | null>(null);
  const [hasInk, setHasInk] = createSignal(false);
  const [modelState, setModelState] = createSignal<ModelState>('loading');
  const [modelError, setModelError] = createSignal(false);
  const [inkLevel, setInkLevel] = createSignal(DEFAULT_INK);

  const context = () => canvas.getContext('2d', { willReadFrequently: true })!;
  const sampleContext = () => sampleCanvas.getContext('2d', { willReadFrequently: true })!;
  let wasm: CnnWasm | undefined;
  let disposed = false;

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
    const input = new Uint8Array(INPUT_SIZE * INPUT_SIZE);
    // The WASM ABI is 784 u8 grayscale pixels. Alpha is the model channel,
    // so translucent strokes remain real intermediate grayscale values.
    for (let i = 0; i < input.length; i++) input[i] = rgba[i * 4 + 3];
    return input;
  };

  const infer = () => {
    inferenceFrame = 0;
    if (!hasInk()) {
      sampleContext().clearRect(0, 0, INPUT_SIZE, INPUT_SIZE);
      setScores(emptyScores());
      setPredictedClass(null);
      setModelError(false);
      return;
    }
    const input = extractInput();
    if (!wasm || modelState() !== 'ready') {
      setScores(emptyScores());
      setPredictedClass(null);
      return;
    }
    try {
      const imagePtr = wasm.image_ptr();
      new Uint8Array(wasm.memory.buffer, imagePtr, input.length).set(input);
      const classId = wasm.predict();
      // Recreate the view after inference in case WASM memory ever grows.
      const raw = new Float32Array(wasm.memory.buffer, wasm.probabilities_ptr(), wasm.class_count());
      const next = validScores(raw);
      if (!next) throw new Error(`CNN inference returned ${raw.length} outputs; expected ${OUTPUTS.length}`);
      if (classId >= OUTPUTS.length) throw new Error(`CNN inference returned invalid class ${classId}`);
      setScores(next);
      setPredictedClass(classId);
      setModelError(false);
    } catch (error) {
      console.error('CNN demo inference failed', error);
      setScores(emptyScores());
      setPredictedClass(null);
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
    setPredictedClass(null);
    setModelError(false);
    applyBrush();
  };

  const winner = () => {
    const classId = predictedClass();
    if (classId == null) return null;
    const score = scores()[classId];
    return score == null ? null : { label: OUTPUTS[classId], score };
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
    void loadCnnWasm().then(instance => {
      if (disposed) return;
      wasm = instance;
      setModelState('ready');
      setModelError(false);
      if (hasInk()) queueInference();
    }).catch(error => {
      if (disposed) return;
      console.error('CNN demo WASM load failed', error);
      setModelState('error');
      setModelError(true);
    });
  });

  onCleanup(() => {
    disposed = true;
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
      <div class="cnn-demo-status" data-state={modelError() || modelState() === 'error' ? 'error' : modelState() === 'ready' ? 'ready' : 'pending'}>
        <span class="cnn-demo-status-dot" aria-hidden="true" />
        {modelState() === 'loading' ? 'LOADING WASM' : modelState() === 'error' ? 'WASM ERROR' : modelError() ? 'INFERENCE ERROR' : 'WASM LIVE'}
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
            <div class="cnn-input-meta"><span>MODEL INPUT</span><strong>28 × 28 · U8 GRAYSCALE</strong></div>
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
