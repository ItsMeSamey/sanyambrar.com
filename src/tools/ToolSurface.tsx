import { createContext, onCleanup, onMount, useContext, type Accessor } from 'solid-js';
import type { ToolId } from '../shared/catalog.ts';

export const ToolContext = createContext<Accessor<HTMLDivElement | undefined>>(() => undefined);

export function ToolSurface(props:{tool:ToolId}) {
  const context = useContext(ToolContext);
  let root!: HTMLDivElement;
  let dispose = () => {};
  let cancelled = false;
  onMount(() => {
    const releaseLoading = (globalThis as typeof globalThis & { SameyLoadingBegin?: () => () => void }).SameyLoadingBegin?.() ?? (() => {});
    void import('./tools.ts').then(module => {
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
    }).finally(releaseLoading);
  });
  onCleanup(() => { cancelled = true; dispose(); });
  return <div ref={root} class="tools-view" data-tool-view={props.tool} aria-live="polite"/>;
}
