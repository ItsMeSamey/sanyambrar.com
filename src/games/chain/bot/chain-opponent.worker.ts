import { chooseMove } from './core';
import { serializeError, type BotRequest, type BotResponse } from './protocol';
import { createChainBotRuntime, type ChainBotRuntime } from './runtime';

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<BotRequest>) => void) | null;
  postMessage: (message: BotResponse) => void;
};
let runtime: ChainBotRuntime | undefined;
let busy = false;

scope.onmessage = (event): void => {
  const request = event.data;
  if (request.type !== 'choose' && request.type !== 'prepare') return;
  if (busy) {
    scope.postMessage({ type: 'error', id: request.id, error: serializeError(new Error('Bot worker is already busy.')) });
    return;
  }
  busy = true;
  void (async () => {
    const started = performance.now();
    try {
      runtime ??= await createChainBotRuntime({
        onStatus: status => scope.postMessage({ type: 'status', id: request.id, status }),
      });
      if (request.type === 'prepare') {
        scope.postMessage({ type: 'ready', id: request.id });
        return;
      }
      scope.postMessage({ type: 'status', id: request.id, status: { phase: 'thinking' } });
      const decision = await chooseMove(request.state, states => runtime!.evaluate(states));
      scope.postMessage({
        type: 'decision', id: request.id,
        decision: { ...decision, backend: runtime.backend, elapsedMs: performance.now() - started },
      });
    } catch (error) {
      scope.postMessage({ type: 'error', id: request.id, error: serializeError(error) });
    } finally { busy = false; }
  })();
};
