import { TOOLS } from '../../shared/catalog.ts';
import { EngineBoundary } from '../../shared/components/EngineBoundary.tsx';
import { TopBar } from '../../shared/components/TopBar.tsx';

function ToolTabs() {
  return <nav class="tool-tabs" aria-label="Tools">{TOOLS.map(tool =>
    <a href={`/tools?tool=${tool.id}`} data-tool={tool.id} data-wide={tool.label} data-narrow={tool.id === 'base' ? 'Enc' : tool.id === 'number' ? 'Num' : tool.id === 'markdown' ? 'MD' : tool.label}>{tool.label}</a>
  )}</nav>;
}

export function ToolsPage() {
  return <EngineBoundary
    label="Tools"
    load={() => import('../engines/tools.ts')}
    mount={module => module.mountTools()}
  >
    <TopBar contextClass="tools-topbar-context" context={<><ToolTabs/><div class="tool-context" id="tool-context" aria-live="polite"/></>}/>
    <main id="tools-root" class="tools-app"><div class="tools-view" aria-live="polite"/></main>
  </EngineBoundary>;
}
