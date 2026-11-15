import { createMemo, createSignal, Errored, Loading, type Component } from 'solid-js';
import { Dynamic } from '@solidjs/web';
import type { ProjectDemoId } from '../data.ts';
import { resilientImport } from '../../shared/resilientImport.ts';
import { formatThrownError } from '../../shared/error.ts';

type DemoModule = { component:Component; preloadAssets:() => Promise<unknown> };
const loaders:Record<ProjectDemoId, () => Promise<DemoModule>> = {
  'reverb-ui': async () => {
    const module = await resilientImport(() => import('./ReverbDemo.tsx'));
    return { component:module.ReverbDemo, preloadAssets:module.preloadReverbDemoAssets };
  },
  'cnn-draw': async () => {
    const module = await resilientImport(() => import('./CnnDemo.tsx'));
    return { component:module.CnnDemo, preloadAssets:module.preloadCnnDemoAssets };
  },
  'zhtml-parse': async () => {
    const module = await resilientImport(() => import('./ZhtmlDemo.tsx'));
    return { component:module.ZhtmlDemo, preloadAssets:module.preloadZhtmlDemoAssets };
  },
  'oneserial-pack': async () => {
    const module = await resilientImport(() => import('./OneSerialDemo.tsx'));
    return { component:module.OneSerialDemo, preloadAssets:module.preloadOneSerialDemoAssets };
  },
};
const pending = new Map<ProjectDemoId, Promise<DemoModule>>();
const ready = new Map<ProjectDemoId, DemoModule>();

function loadDemo(id:ProjectDemoId) {
  let task = pending.get(id);
  if (!task) {
    task = loaders[id]().then(module => {
      ready.set(id, module);
      return module;
    }).catch(error => {
      pending.delete(id);
      throw error;
    });
    pending.set(id, task);
  }
  return task;
}

export async function preloadProjectDemo(id:ProjectDemoId) {
  const module = await loadDemo(id);
  await module.preloadAssets();
}

function DemoContent(props:{id:ProjectDemoId;attempt:number}) {
  const component = createMemo(() => {
    void props.attempt;
    return ready.get(props.id)?.component ?? loadDemo(props.id).then(module => module.component);
  });
  return <Dynamic component={component()}/>;
}

/** Route pages and inline previews use the same real component and asset cache. */
export function ProjectDemo(props:{id:ProjectDemoId}) {
  const [attempt, setAttempt] = createSignal(0);
  return <Errored fallback={(error, reset) => <div class="project-demo-error" role="alert">
    <p>Demo could not load.</p>
    <pre class="samey-error-stack">{formatThrownError(error())}</pre>
    <button type="button" onClick={() => {
      pending.delete(props.id);
      ready.delete(props.id);
      setAttempt(value => value + 1);
      queueMicrotask(reset);
    }}>Retry</button>
  </div>}>
    <Loading fallback={<div class="project-demo-loading" role="status">Loading demo</div>}>
      <DemoContent id={props.id} attempt={attempt()}/>
    </Loading>
  </Errored>;
}
