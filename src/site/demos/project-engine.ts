import { createProjectEngineRunner } from './project-engine-runner.ts';
import EngineWorker from '../workers/project-engine-worker.ts?worker';
import engineUrl from './assets/project-engines.wasm?url';

let preload: Promise<void> | undefined;
export function preloadProjectEngine(): Promise<void> {
  // Prerender warms route modules too; only a browser can fetch this asset URL.
  if (import.meta.env.SSR || typeof window === 'undefined') return Promise.resolve();
  preload ??= fetch(engineUrl).then(response => {
    if (!response.ok) throw new Error('The demo engine could not be downloaded.');
    return response.arrayBuffer();
  }).then(() => {}).catch(error => { preload = undefined; throw error; });
  return preload;
}
export const createProjectEngine = () => createProjectEngineRunner(() => new EngineWorker());
