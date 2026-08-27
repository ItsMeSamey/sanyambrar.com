import { onCleanup, onMount } from 'solid-js';
import { TOOLS } from '../../shared/catalog.ts';
import { AppearanceButton, SearchButton, TopBar } from '../components/SiteChrome.tsx';

export function ToolsPage() {
  onMount(() => {
    let disposed = false;
    let dispose = () => {};
    void import('../engines/tools.ts').then(module => {
      if (disposed) return;
      dispose = module.mountTools();
    });
    onCleanup(() => { disposed = true; dispose(); });
  });
  return <>
    <TopBar class="tools-top">
      <nav class="tool-tabs" aria-label="Tools">{TOOLS.map(tool => <a href={`/tools?tool=${tool.id}`} data-tool={tool.id} data-wide={tool.label} data-narrow={tool.id === 'base' ? 'Enc' : tool.id === 'number' ? 'Num' : tool.id === 'markdown' ? 'MD' : tool.label}>{tool.label}</a>)}</nav>
      <div class="tool-context" id="tool-context" aria-live="polite"/>
      <nav class="top-nav tools-site-nav" aria-label="Primary"><a href="/work">Work</a><AppearanceButton/><SearchButton/></nav>
    </TopBar>
    <main id="tools-root" class="tools-app"><div class="tools-view" aria-live="polite"/></main>
  </>;
}
