import './style.css';
import { Show, createContext, createSignal, onCleanup, onSettled, useContext, type Accessor } from 'solid-js';
import * as Select from '@kobalte/core/select';
import * as Tabs from '@kobalte/core/tabs';
import { Check } from '../shared/components/Icons.tsx';
import { ChevronsUpDown } from '../shared/components/Icons.tsx';
import { TOOLS, type ToolId } from '../shared/catalog.ts';
import { TopBar } from '../shared/components/TopBar.tsx';
import { resilientImport } from '../shared/resilientImport.ts';
import { formatThrownError } from '../shared/error.ts';


const ToolContext = createContext<Accessor<HTMLDivElement | undefined>>(() => undefined);
type ToolsModule = typeof import('./tools.ts');
let toolsModule: ToolsModule | undefined;
let toolsModulePromise: Promise<ToolsModule> | undefined;

function loadToolsModule(): Promise<ToolsModule> {
  if (toolsModule) return Promise.resolve(toolsModule);
  if (toolsModulePromise) return toolsModulePromise;
  const releaseLoading = globalThis.SameyLoadingBeginAfterDelay?.() ?? (() => {});
  toolsModulePromise = resilientImport(() => import('./tools.ts')).then(module => {
    toolsModule = module;
    return module;
  }).catch(error => {
    toolsModulePromise = undefined;
    throw error;
  }).finally(releaseLoading);
  return toolsModulePromise;
}

function ToolSurface(props:{tool:ToolId}) {
  const context = useContext(ToolContext);
  let root!: HTMLDivElement;
  let dispose = () => {};
  let cancelled = false;
  onSettled(() => {
    void loadToolsModule().then(module => {
      if (cancelled) return;
      dispose = module.mountTool(props.tool, root, context());
    }).catch(error => {
      if (cancelled) return;
      const box = document.createElement('div');
      box.className = 'tool-fatal';
      const title = document.createElement('strong');
      title.textContent = 'Tool failed to load.';
      const detail = document.createElement('pre');
      detail.className = 'samey-error-stack';
      detail.textContent = formatThrownError(error);
      box.append(title, detail);
      root.replaceChildren(box);
    });
  });
  onCleanup(() => { cancelled = true; dispose(); });
  return <div ref={root} class="tools-view" data-tool-view={props.tool} aria-live="polite"/>;
}

const validTools = new Set<string>(TOOLS.map(tool => tool.id));
const toolOptions = [...TOOLS];
const isToolId = (value: unknown): value is ToolId => typeof value === 'string' && validTools.has(value);
const selectedTool = ():ToolId => {
  const value = new URLSearchParams(location.search).get('tool');
  if (value === 'ascii' || value === 'words') return 'text';
  return isToolId(value) ? value : 'text';
};

const setToolUrl = (tool:ToolId) => {
  if (selectedTool() === tool) return;
  const url = new URL(location.href);
  url.pathname = '/tools/';
  url.searchParams.set('tool', tool);
  history.pushState(null, '', url);
  dispatchEvent(new Event('samey-solid-routechange'));
};

function ToolTabs(props:{active:ToolId}) {
  const selected = () => toolOptions.find(tool => tool.id === props.active) ?? toolOptions[0];
  const [selectOpen, setSelectOpen] = createSignal(false);
  let selectTrigger!: HTMLButtonElement;
  return <div class="tool-switcher">
    <Tabs.Root class="tool-tabs-root" value={props.active} onChange={value => { if (isToolId(value)) setToolUrl(value); }}>
      <Tabs.List class="tool-tabs" aria-label="Tools">
        {TOOLS.map(tool => <Tabs.Trigger class="tool-tab" value={tool.id}>{tool.label}</Tabs.Trigger>)}
      </Tabs.List>
    </Tabs.Root>
    <Select.Root
      options={toolOptions}
      optionValue="id"
      optionTextValue="label"
      value={selected()}
      open={selectOpen()}
      onOpenChange={setSelectOpen}
      onChange={tool => tool && setToolUrl(tool.id)}
      itemComponent={props => <Select.Item class="tool-select-item" item={props.item}>
        <Select.ItemLabel>{props.item.rawValue.label}</Select.ItemLabel>
        <Select.ItemIndicator class="tool-select-check"><Check aria-hidden="true"/></Select.ItemIndicator>
      </Select.Item>}
    >
      <Select.Trigger ref={el => selectTrigger = el} class="tool-select-trigger" aria-label="Tool">
        <Select.Value<(typeof toolOptions)[number]>>{state => state.selectedOption().label}</Select.Value>
        <Select.Icon class="tool-select-icon"><ChevronsUpDown aria-hidden="true"/></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content data-samey-overlay="" class="tool-select-content" onKeyDown={event => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          setSelectOpen(false);
          requestAnimationFrame(() => selectTrigger.isConnected && selectTrigger.focus({ preventScroll: true }));
        }}><Select.Listbox class="tool-select-list"/></Select.Content>
      </Select.Portal>
    </Select.Root>
  </div>;
}

export function ToolsPage() {
  let context: HTMLDivElement | undefined;
  const [active, setActive] = createSignal<ToolId>(selectedTool());
  const sync = () => setActive(selectedTool());
  onSettled(() => {
    addEventListener('popstate', sync);
    addEventListener('samey-solid-routechange', sync);
  });
  onCleanup(() => {
    removeEventListener('popstate', sync);
    removeEventListener('samey-solid-routechange', sync);
  });
  return <ToolContext value={() => context}>
    <TopBar contextClass="tools-topbar-context" context={<><ToolTabs active={active()}/><div ref={el => context = el} class="tool-context" aria-live="polite"/></>}/>
    <main class="tools-app">
      <Show keyed when={active()}>{tool => <ToolSurface tool={tool}/>}</Show>
    </main>
  </ToolContext>;
}
