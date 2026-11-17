import { renderPreparedRhythm, type RhythmRenderRequest, type RhythmRenderResponse } from './rhythm-synthesis.ts';

const worker = globalThis as unknown as {
  onmessage: ((event: MessageEvent<RhythmRenderRequest>) => void) | null;
  postMessage: (message: RhythmRenderResponse, transfer?: Transferable[]) => void;
};
worker.onmessage = event => {
  const { id, composition } = event.data;
  try {
    const pcm = renderPreparedRhythm(composition);
    const buffers = new Set<ArrayBuffer>();
    for (const audio of [pcm.phrase, ...pcm.taps]) {
      buffers.add(audio.left.buffer);
      buffers.add(audio.right.buffer);
    }
    worker.postMessage({ id, pcm }, [...buffers]);
  } catch {
    worker.postMessage({ id, error: 'Unable to prepare this phrase.' });
  }
};
