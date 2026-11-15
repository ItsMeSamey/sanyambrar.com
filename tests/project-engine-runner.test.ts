import { test, expect } from 'bun:test';
import { createProjectEngineRunner } from '../src/site/demos/project-engine-runner.ts';

test('late worker errors and messages cannot terminate a replacement request', async () => {
  const workers: Array<{ onerror?: () => void; onmessage?: (event: { data: unknown }) => void; terminated: boolean; sent?: { id: number }; terminate(): void; postMessage(value: { id: number }): void }> = [];
  const runner = createProjectEngineRunner(() => {
    const worker = { terminated: false, terminate() { this.terminated = true; }, postMessage(value: { id: number }) { Object.assign(this, { sent: value }); } };
    workers.push(worker);
    return worker as unknown as Worker;
  });
  const first = runner.run(0, {}).catch(error => (error as Error).message);
  const previous = workers[0]!;
  const second = runner.run<{ ok: boolean }>(0, {});
  const current = workers[1]!;
  expect(await first).toBe('Demo closed.');
  previous.onerror?.();
  previous.onmessage?.({ data: { id: previous.sent!.id, result: { ok: false }, elapsed: 1 } });
  expect(current.terminated).toBe(false);
  current.onmessage?.({ data: { id: current.sent!.id, result: { ok: true }, elapsed: 2 } });
  expect(await second).toEqual({ result: { ok: true }, elapsed: 2 });
  expect(current.terminated).toBe(true);
  runner.destroy();
});

test('closing the demo rejects its pending run and ignores late completion', async () => {
  let worker!: Worker;
  const runner = createProjectEngineRunner(() => worker = { terminate() {}, postMessage() {} } as unknown as Worker);
  const result = runner.run(0, {}).catch(error => (error as Error).message);
  runner.destroy();
  worker.onmessage?.({ data: { id: 1, result: {}, elapsed: 0 } } as MessageEvent);
  expect(await result).toBe('Demo closed.');
});
