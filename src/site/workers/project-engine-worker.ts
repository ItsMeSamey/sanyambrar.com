import engineUrl from '../demos/assets/project-engines.wasm?url';

type Engine = WebAssembly.Exports & { memory: WebAssembly.Memory; input_ptr(): number; input_capacity(): number; output_ptr(): number; output_len(): number; run(operation: number, length: number): void };
const instance = fetch(engineUrl).then(async response => {
  if (!response.ok) throw new Error('The demo engine could not be downloaded.');
  return (await WebAssembly.instantiate(await response.arrayBuffer())).instance.exports as Engine;
});
self.onmessage = async (event: MessageEvent<{ id: number; operation: number; input: unknown }>) => {
  const { id, operation, input } = event.data;
  try {
    const engine = await instance;
    const bytes = new TextEncoder().encode(JSON.stringify(input));
    if (bytes.length > engine.input_capacity()) throw new Error('Input exceeds the demo limit.');
    new Uint8Array(engine.memory.buffer, engine.input_ptr(), bytes.length).set(bytes);
    const start = performance.now();
    engine.run(operation, bytes.length);
    const elapsed = performance.now() - start;
    const result: unknown = JSON.parse(new TextDecoder().decode(new Uint8Array(engine.memory.buffer, engine.output_ptr(), engine.output_len())));
    self.postMessage({ id, result, elapsed });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : 'The engine could not run.' });
  }
};
