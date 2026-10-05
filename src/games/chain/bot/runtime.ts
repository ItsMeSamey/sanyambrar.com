import * as ort from 'onnxruntime-web/webgpu';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url';
import mjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url';
import modelUrl from './assets/epoch134.onnx?url';
import { encodeBatch, type BoardState } from './core';
import type { BotStatus } from './protocol';

const MODEL_SHA256 = '691f5a176b9835efee8f0760582f3f5f34f6d284582bb9839fa1d625f032e86e';

export interface ChainBotRuntime {
  readonly backend: 'webgpu' | 'wasm';
  evaluate(states: readonly BoardState[]): Promise<{ policyLogits: Float32Array; valueLogits: Float32Array }>;
  dispose(): Promise<void>;
}
export interface RuntimeOptions {
  backend?: 'auto' | 'wasm';
  onStatus?: (status: BotStatus) => void;
}

async function loadModel(onStatus?: RuntimeOptions['onStatus']): Promise<Uint8Array> {
  onStatus?.({ phase: 'loading', progress: 0 });
  const response = await fetch(modelUrl, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Could not load Chain Reaction model: HTTP ${response.status} ${response.statusText}`);
  const total = Number(response.headers.get('content-length'));
  let bytes: Uint8Array;
  if (response.body) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        onStatus?.({ phase: 'loading', ...(total > 0 ? { progress: Math.min(0.95, received / total * 0.95) } : {}) });
      }
    } finally { reader.releaseLock(); }
    bytes = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  } else bytes = new Uint8Array(await response.arrayBuffer());
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer);
    const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    if (actual !== MODEL_SHA256) throw new Error(`Chain Reaction model integrity failure: expected ${MODEL_SHA256}, received ${actual}`);
  }
  onStatus?.({ phase: 'loading', progress: 1 });
  return bytes;
}

export async function createChainBotRuntime(options: RuntimeOptions = {}): Promise<ChainBotRuntime> {
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  // Absolute self-hosted URLs also work when the worker's own URL is nested.
  ort.env.wasm.wasmPaths = {
    wasm: new URL(wasmUrl, globalThis.location.href).href,
    mjs: new URL(mjsUrl, globalThis.location.href).href,
  };
  const model = await loadModel(options.onStatus);
  let backend: 'webgpu' | 'wasm' = 'wasm';
  let session: ort.InferenceSession;
  let disposed = false;
  let evaluating = false;
  let gpuFailure: unknown;
  const createSession = (provider: 'webgpu' | 'wasm') => ort.InferenceSession.create(model, {
    executionProviders: [provider],
    graphOptimizationLevel: 'all',
  });
  if (options.backend !== 'wasm' && typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      session = await createSession('webgpu');
      backend = 'webgpu';
    } catch (error) {
      gpuFailure = error;
      console.warn('Chain Reaction WebGPU initialization failed; retrying the same model with WASM.', error);
      try { session = await createSession('wasm'); }
      catch (wasmError) { throw new AggregateError([error, wasmError], 'Both Chain Reaction inference backends failed to initialize.'); }
    }
  } else session = await createSession('wasm');

  async function infer(states: readonly BoardState[]) {
    const encoded = encodeBatch([...states]);
    const feeds = {
      features: new ort.Tensor('float32', encoded.features, [encoded.batch, 16, encoded.rows, encoded.cols]),
      player_meta: new ort.Tensor('float32', encoded.playerMeta, [encoded.batch, 9, 3]),
      player_mask: new ort.Tensor('bool', encoded.playerMask, [encoded.batch, 9]),
    };
    let outputs: ort.InferenceSession.OnnxValueMapType | undefined;
    try {
      outputs = await session.run(feeds);
      const policy = outputs.policy_logits;
      const value = outputs.value_logits;
      if (!(policy?.data instanceof Float32Array) || !(value?.data instanceof Float32Array)
        || policy.data.length !== encoded.batch * encoded.rows * encoded.cols
        || value.data.length !== encoded.batch * 9) {
        throw new Error('Chain Reaction model returned an invalid output shape or type.');
      }
      // ORT owns tensor storage. Search owns copies that survive tensor disposal.
      return { policyLogits: new Float32Array(policy.data), valueLogits: new Float32Array(value.data) };
    } finally {
      for (const tensor of Object.values(feeds)) tensor.dispose();
      if (outputs) for (const tensor of Object.values(outputs)) tensor.dispose();
    }
  }

  return {
    get backend() { return backend; },
    async evaluate(states) {
      if (disposed) throw new DOMException('Bot runtime disposed.', 'AbortError');
      if (evaluating) throw new Error('Concurrent bot inference is not supported.');
      evaluating = true;
      try {
        try { return await infer(states); }
        catch (error) {
          if (backend !== 'webgpu') {
            if (gpuFailure !== undefined) throw new AggregateError([gpuFailure, error], 'Chain Reaction inference failed after WebGPU fallback.');
            throw error;
          }
          gpuFailure = error;
          console.warn('Chain Reaction WebGPU inference failed; rerunning this batch with WASM.', error);
          try { await session.release(); }
          catch (releaseError) { console.warn('Failed to release the broken Chain Reaction WebGPU session.', releaseError); }
          backend = 'wasm';
          try {
            session = await createSession('wasm');
            return await infer(states);
          } catch (wasmError) {
            throw new AggregateError([error, wasmError], 'Both Chain Reaction inference backends failed.');
          }
        }
      } finally { evaluating = false; }
    },
    async dispose() {
      if (disposed) return;
      if (evaluating) throw new Error('Wait for inference to finish before disposing its runtime.');
      disposed = true;
      await session.release();
    },
  };
}
