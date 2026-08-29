import { createContext, onCleanup, onMount, useContext, type Accessor } from 'solid-js';
import type { ToolId } from '../shared/catalog.ts';

export const ToolContext = createContext<Accessor<HTMLDivElement | undefined>>(() => undefined);

type ToolsModule = typeof import('./tools.ts');
let toolsModule: ToolsModule | undefined;
let toolsModulePromise: Promise<ToolsModule> | undefined;

function loadToolsModule(): Promise<ToolsModule> {
  if (toolsModule) return Promise.resolve(toolsModule);
  if (toolsModulePromise) return toolsModulePromise;
  const api = globalThis as typeof globalThis & { SameyLoadingBeginAfterDelay?: (delay?: number) => () => void };
  const releaseLoading = api.SameyLoadingBeginAfterDelay?.() ?? (() => {});
  toolsModulePromise = import('./tools.ts').then(module => {
    toolsModule = module;
    return module;
  }).catch(error => {
    toolsModulePromise = undefined;
    throw error;
  }).finally(releaseLoading);
  return toolsModulePromise;
}

export function ToolSurface(props:{tool:ToolId}) {
  const context = useContext(ToolContext);
  let root!: HTMLDivElement;
  let dispose = () => {};
  let cancelled = false;
  onMount(() => {
    void loadToolsModule().then(module => {
      if (cancelled) return;
      dispose = module.mountTool(props.tool, root, context());
    }).catch(error => {
      if (cancelled) return;
      const box = document.createElement('div');
      box.className = 'tool-fatal';
      const title = document.createElement('strong');
      title.textContent = 'Tool failed to load.';
      const detail = document.createElement('span');
      detail.textContent = error instanceof Error ? error.message : String(error);
      box.append(title, detail);
      root.replaceChildren(box);
    });
  });
  onCleanup(() => { cancelled = true; dispose(); });
  return <div ref={root} class="tools-view" data-tool-view={props.tool} aria-live="polite"/>;
}
