/**
 * @typedef {{
 *   memory: WebAssembly.Memory,
 *   image_ptr: () => number,
 *   probabilities_ptr: () => number,
 *   predict: () => number,
 *   class_count: () => number,
 *   unknown_class: () => number,
 * }} CnnExports
 */

const INPUT_PIXELS = 28 * 28;
const OUTPUTS = 11;
const UNKNOWN_CLASS = 10;

/** @type {CnnExports | null} */
let wasm = null;

async function instantiateCnn() {
  const wasmUrl = new URL('/cnn.wasm', self.location.origin);
  wasmUrl.search = self.location.search;
  const response = await fetch(wasmUrl);
  if (!response.ok) throw new Error(`cnn.wasm: HTTP ${response.status}`);

  let result;
  try {
    result = await WebAssembly.instantiateStreaming(response.clone());
  } catch {
    result = await WebAssembly.instantiate(await response.arrayBuffer());
  }

  const exports = result.instance.exports;
  if (!(exports.memory instanceof WebAssembly.Memory) ||
      typeof exports.image_ptr !== 'function' || typeof exports.probabilities_ptr !== 'function' ||
      typeof exports.predict !== 'function' || typeof exports.class_count !== 'function' ||
      typeof exports.unknown_class !== 'function') {
    throw new Error('cnn.wasm has an incompatible ABI');
  }
  if (exports.class_count() !== OUTPUTS || exports.unknown_class() !== UNKNOWN_CLASS) {
    throw new Error(`cnn.wasm metadata mismatch: ${exports.class_count()} classes, unknown=${exports.unknown_class()}`);
  }

  // Pay the lazy model initialization cost here in the worker, not on the
  // first pointer movement on the UI thread.
  new Uint8Array(exports.memory.buffer, exports.image_ptr(), INPUT_PIXELS).fill(0);
  exports.predict();
  return {
    memory: exports.memory,
    image_ptr: /** @type {() => number} */ (exports.image_ptr),
    probabilities_ptr: /** @type {() => number} */ (exports.probabilities_ptr),
    predict: /** @type {() => number} */ (exports.predict),
    class_count: /** @type {() => number} */ (exports.class_count),
    unknown_class: /** @type {() => number} */ (exports.unknown_class),
  };
}

/** @param {CnnExports} cnn */
function probabilities(cnn) {
  return Array.from(new Float32Array(
    cnn.memory.buffer,
    cnn.probabilities_ptr(),
    cnn.class_count(),
  ));
}

self.addEventListener('message', /** @param {MessageEvent<unknown>} event */ event => {
  const raw = event.data;
  if (!raw || typeof raw !== 'object') return;
  const message = /** @type {Record<string, unknown>} */ (raw);
  if (message.type !== 'predict' || typeof message.id !== 'number' || !Number.isInteger(message.id)) return;
  if (!wasm) {
    self.postMessage({ type: 'error', id: message.id, message: 'CNN worker is not ready' });
    return;
  }
  try {
    const input = message.input;
    if (!(input instanceof Uint8Array) || input.length !== INPUT_PIXELS) {
      throw new Error(`Expected ${INPUT_PIXELS} grayscale bytes`);
    }
    new Uint8Array(wasm.memory.buffer, wasm.image_ptr(), INPUT_PIXELS).set(input);
    const classId = wasm.predict();
    if (classId >= wasm.class_count()) throw new Error(`Invalid class ${classId}`);
    self.postMessage({ type: 'result', id: message.id, classId, probabilities: probabilities(wasm) });
  } catch (error) {
    self.postMessage({ type: 'error', id: message.id, message: error instanceof Error ? error.message : String(error) });
  }
});

instantiateCnn().then(instance => {
  wasm = instance;
  self.postMessage({ type: 'ready' });
}).catch(error => {
  self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
});
