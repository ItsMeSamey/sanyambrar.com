import type { BoardState } from './core';
import { deserializeError, type BotDecision, type BotRequest, type BotResponse, type BotStatus } from './protocol';

interface Pending {
  id: number;
  resolve: (decision: BotDecision | undefined) => void;
  reject: (error: unknown) => void;
  onStatus?: (status: BotStatus) => void;
}

export class ChainBotClient {
  private worker?: Worker;
  private pending?: Pending;
  private nextId = 0;

  private preparation?: Promise<void>;

  prepare(onStatus?: (status: BotStatus) => void): Promise<void> {
    return this.preparation ??= this.request({ type: 'prepare' }, onStatus).then(() => undefined);
  }

  async chooseMove(state: BoardState, onStatus?: (status: BotStatus) => void): Promise<BotDecision> {
    await this.prepare(onStatus);
    const decision = await this.request({ type: 'choose', state }, onStatus);
    if (!decision) throw new Error('Bot worker returned no decision.');
    return decision;
  }

  private request(request: Omit<Extract<BotRequest, { type: 'prepare' }>, 'id'> | Omit<Extract<BotRequest, { type: 'choose' }>, 'id'>,
    onStatus?: (status: BotStatus) => void): Promise<BotDecision | undefined> {
    if (this.pending) return Promise.reject(new Error('A Chain Reaction bot request is already running.'));
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      this.pending = { id, resolve, reject, onStatus };
      try {
        if (!this.worker) {
          const worker = new Worker(new URL('./chain-opponent.worker.ts', import.meta.url), { type: 'module', name: 'chain-opponent' });
          this.worker = worker;
          worker.onmessage = (event: MessageEvent<BotResponse>) => {
            if (this.worker !== worker || !this.pending || event.data.id !== this.pending.id) return;
            const message = event.data;
            if (message.type === 'status') {
              try { this.pending.onStatus?.(message.status); }
              catch (error) { this.fail(error); }
              return;
            }
            const pending = this.pending;
            this.pending = undefined;
            if (message.type === 'ready') pending.resolve(undefined);
            else if (message.type === 'decision') pending.resolve(message.decision);
            else {
              this.worker = undefined;
              worker.terminate();
              pending.reject(deserializeError(message.error));
            }
          };
          worker.onerror = event => {
            if (this.worker !== worker) return;
            event.preventDefault();
            this.fail(event.error instanceof Error ? event.error : new Error(
              `Bot worker failed: ${event.message} (${event.filename}:${event.lineno}:${event.colno})`,
            ));
          };
          worker.onmessageerror = () => {
            if (this.worker === worker) this.fail(new Error('Could not deserialize the bot worker response.'));
          };
        }
        // Structured cloning preserves the caller's live board buffers.
        this.worker.postMessage({ ...request, id });
      } catch (error) { this.fail(error); }
    });
  }

  cancel(): void { this.fail(new DOMException('Bot request cancelled.', 'AbortError')); }
  dispose(): void { this.cancel(); }

  private fail(error: unknown): void {
    const pending = this.pending;
    this.pending = undefined;
    this.worker?.terminate();
    this.worker = undefined;
    pending?.reject(error);
  }
}
