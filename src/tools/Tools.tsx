import { Match, Switch, createSignal, onCleanup, onMount } from 'solid-js';
import * as Select from '@kobalte/core/select';
import Check from 'lucide-solid/icons/check';
import ChevronsUpDown from 'lucide-solid/icons/chevrons-up-down';
import ArrowUpRight from 'lucide-solid/icons/arrow-up-right';
import { TOOLS, type ToolId } from '../shared/catalog.ts';
import { TopBar } from '../shared/components/TopBar.tsx';
import { DiffTool } from './DiffTool.tsx';
import { EncodeTool } from './EncodeTool.tsx';
import { MarkdownTool } from './MarkdownTool.tsx';
import { NumbersTool } from './NumbersTool.tsx';
import { TextTool } from './TextTool.tsx';

const validTools = new Set<ToolId>(TOOLS.map(tool => tool.id));
const toolOptions = [...TOOLS];
const selectedTool = ():ToolId => {
  const value = new URLSearchParams(location.search).get('tool');
  if (value === 'ascii' || value === 'words') return 'text';
  return validTools.has(value as ToolId) ? value as ToolId : 'text';
};

const setToolUrl = (tool:ToolId) => {
  if (selectedTool() === tool) return;
  const url = new URL(location.href);
  url.pathname = '/tools/';
  url.searchParams.set('tool', tool);
  history.pushState(null, '', url);
  dispatchEvent(new Event('samey-solid-routechange'));
};

function ToolEditorialNav(props:{active:ToolId}) {
  const selected = () => toolOptions.find(tool => tool.id === props.active) ?? toolOptions[0];
  return <>
    <nav class="tool-editorial-nav" aria-label="Tools">
      {TOOLS.map((tool, index) => <button
        type="button"
        class="tool-editorial-item"
        classList={{ active: props.active === tool.id }}
        aria-current={props.active === tool.id ? 'page' : undefined}
        onClick={() => setToolUrl(tool.id)}
      >
        <span class="tool-editorial-index">{String(index + 1).padStart(2, '0')} / {tool.label.toUpperCase()}</span>
        <span class="tool-editorial-top"><strong>{tool.title}</strong><ArrowUpRight aria-hidden="true"/></span>
        <span class="tool-editorial-copy">{tool.note}</span>
      </button>)}
    </nav>
    <Select.Root
      options={toolOptions}
      optionValue="id"
      optionTextValue="label"
      value={selected()}
      onChange={tool => tool && setToolUrl(tool.id)}
      itemComponent={props => <Select.Item class="tool-select-item" item={props.item}>
        <Select.ItemLabel>{props.item.rawValue.title}</Select.ItemLabel>
        <Select.ItemIndicator class="tool-select-check"><Check aria-hidden="true"/></Select.ItemIndicator>
      </Select.Item>}
    >
      <Select.Trigger class="tool-select-trigger tool-editorial-select" aria-label="Tool">
        <Select.Value<(typeof toolOptions)[number]>>{state => state.selectedOption().title}</Select.Value>
        <Select.Icon class="tool-select-icon"><ChevronsUpDown aria-hidden="true"/></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content class="tool-select-content"><Select.Listbox class="tool-select-list"/></Select.Content>
      </Select.Portal>
    </Select.Root>
  </>;
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
    <TopBar/>
    <section class="tools-editorial-shell" aria-label="Tool selection">
      <div class="tools-editorial-head">
        <span>TOOLS</span>
        <span>{String(TOOLS.length).padStart(2, '0')} UTILITIES</span>
      </div>
      <ToolEditorialNav active={active()}/>
      <div class="tool-context" id="tool-context" aria-live="polite"/>
    </section>
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
