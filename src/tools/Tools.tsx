import { Match, Switch, createSignal, onCleanup, onMount } from 'solid-js';
import { TOOLS, type ToolId } from '../shared/catalog.ts';
import { TopBar } from '../shared/components/TopBar.tsx';
import { DiffTool } from './DiffTool.tsx';
import { EncodeTool } from './EncodeTool.tsx';
import { MarkdownTool } from './MarkdownTool.tsx';
import { NumbersTool } from './NumbersTool.tsx';
import { TextTool } from './TextTool.tsx';

const validTools = new Set<ToolId>(TOOLS.map(tool => tool.id));
const selectedTool = ():ToolId => {
  const value = new URLSearchParams(location.search).get('tool');
  if (value === 'ascii' || value === 'words') return 'text';
  return validTools.has(value as ToolId) ? value as ToolId : 'text';
};

function ToolTabs(props:{active:ToolId}) {
  return <nav class="tool-tabs" aria-label="Tools">{TOOLS.map(tool =>
    <a href={`/tools/?tool=${tool.id}`} data-narrow={tool.id === 'base' ? 'Enc' : tool.id === 'number' ? 'Num' : tool.id === 'markdown' ? 'MD' : tool.label} aria-current={props.active === tool.id ? 'page' : undefined}>{tool.label}</a>
  )}</nav>;
}

export function ToolsPage() {
  const [active, setActive] = createSignal<ToolId>(selectedTool());
  const sync = () => setActive(selectedTool());
  onMount(() => {
    addEventListener('popstate', sync);
    addEventListener('samey-solid-routechange', sync);
  });
  onCleanup(() => {
    removeEventListener('popstate', sync);
    removeEventListener('samey-solid-routechange', sync);
  });
  return <>
    <TopBar contextClass="tools-topbar-context" context={<><ToolTabs active={active()}/><div class="tool-context" id="tool-context" aria-live="polite"/></>}/>
    <main id="tools-root" class="tools-app">
      <Switch fallback={<TextTool/>}>
        <Match when={active() === 'text'}><TextTool/></Match>
        <Match when={active() === 'base'}><EncodeTool/></Match>
        <Match when={active() === 'diff'}><DiffTool/></Match>
        <Match when={active() === 'number'}><NumbersTool/></Match>
        <Match when={active() === 'markdown'}><MarkdownTool/></Match>
      </Switch>
    </main>
  </>;
}
