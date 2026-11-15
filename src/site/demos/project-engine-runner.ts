export function createProjectEngineRunner(makeWorker: () => Worker) {
  let cancelCurrent: (() => void) | undefined;
  let sequence = 0;
  const destroy = () => { cancelCurrent?.(); };
  return {
    destroy,
    run<T>(operation: number, input: unknown): Promise<{ result: T; elapsed: number }> {
      destroy();
      const id = ++sequence;
      const worker = makeWorker();
      return new Promise((resolve, reject) => {
        let settled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const finish = () => {
          settled = true; clearTimeout(timer); worker.terminate();
          if (cancelCurrent === cancel) cancelCurrent = undefined;
        };
        const cancel = () => { if (settled) return; finish(); reject(new Error('Demo closed.')); };
        cancelCurrent = cancel;
        worker.onerror = () => { if (settled) return; finish(); reject(new Error('The WebAssembly engine could not start. Try again.')); };
        worker.onmessage = (event: MessageEvent<{ id: number; result?: T & { error?: string }; elapsed: number; error?: string }>) => {
          if (settled || event.data.id !== id) return;
          finish();
          const failure = event.data.error ?? event.data.result?.error;
          if (failure) reject(new Error(failure));
          else resolve({ result: event.data.result as T, elapsed: event.data.elapsed });
        };
        timer = setTimeout(() => { if (settled) return; finish(); reject(new Error('This input took too long. Try a smaller example.')); }, 8000);
        worker.postMessage({ id, operation, input });
      });
    },
  };
}
