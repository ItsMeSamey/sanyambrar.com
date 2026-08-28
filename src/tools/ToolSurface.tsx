import { onCleanup, onMount } from 'solid-js';
import type { ToolId } from '../shared/catalog.ts';

export function ToolSurface(props:{tool:ToolId}) {
  let root!: HTMLDivElement;
  let dispose = () => {};
  let cancelled = false;
  onMount(() => {
    void import('./tools.ts').then(module => {
      if (cancelled) return;
      dispose = module.mountTool(props.tool, root);
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
