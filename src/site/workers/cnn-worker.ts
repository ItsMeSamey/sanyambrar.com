import cnnWasmUrl from './cnn.wasm?url';
import { errorMessage, formatThrownError } from '../../shared/error.ts';

type CnnExports = {
  memory: WebAssembly.Memory;
  image_ptr: () => number;
  probabilities_ptr: () => number;
  predict: () => number;
  class_count: () => number;
  unknown_class: () => number;
};

type WorkerScope = {
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  postMessage(message: unknown): void;
};

const workerScope = globalThis as unknown as WorkerScope;
const INPUT_PIXELS = 28 * 28;
const OUTPUTS = 11;
const UNKNOWN_CLASS = 10;
let wasm: CnnExports | null = null;

async function instantiateCnn(): Promise<CnnExports> {
  const response = await fetch(cnnWasmUrl);
  if (!response.ok) throw new Error(`cnn.wasm: HTTP ${response.status}`);

  let result: WebAssembly.WebAssemblyInstantiatedSource;
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
  const cnn = exports as unknown as CnnExports;
  if (cnn.class_count() !== OUTPUTS || cnn.unknown_class() !== UNKNOWN_CLASS) {
    throw new Error(`cnn.wasm metadata mismatch: ${cnn.class_count()} classes, unknown=${cnn.unknown_class()}`);
  }

  new Uint8Array(cnn.memory.buffer, cnn.image_ptr(), INPUT_PIXELS).fill(0);
  cnn.predict();
  return cnn;
}

function probabilities(cnn: CnnExports): number[] {
  return Array.from(new Float32Array(cnn.memory.buffer, cnn.probabilities_ptr(), cnn.class_count()));
}

workerScope.addEventListener('message', event => {
  const raw = event.data;
  if (!raw || typeof raw !== 'object') return;
  const message = raw as Record<string, unknown>;
  if (message.type !== 'predict' || typeof message.id !== 'number' || !Number.isInteger(message.id)) return;
  if (!wasm) {
    workerScope.postMessage({ type: 'error', id: message.id, message: 'CNN worker is not ready' });
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
    workerScope.postMessage({ type: 'result', id: message.id, classId, probabilities: probabilities(wasm) });
  } catch (error) {
    workerScope.postMessage({ type: 'error', id: message.id, message: errorMessage(error), detail: formatThrownError(error) });
  }
});

instantiateCnn().then(instance => {
  wasm = instance;
  workerScope.postMessage({ type: 'ready' });
}).catch(error => {
  workerScope.postMessage({ type: 'error', message: errorMessage(error), detail: formatThrownError(error) });
});
