import { TOOLS } from '../../shared/catalog.ts';
import { HomeBrand } from '../../shared/components/Brand.tsx';
import { EngineBoundary } from '../../shared/components/EngineBoundary.tsx';
import { PrimaryNav, TopBar } from '../components/SiteChrome.tsx';

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
    <TopBar class="tools-top" brand={<HomeBrand class="tools-home-brand"/>}>
      <ToolTabs/>
      <div class="tool-context" id="tool-context" aria-live="polite"/>
      <PrimaryNav class="top-nav tools-site-nav"/>
    </TopBar>
    <main id="tools-root" class="tools-app"><div class="tools-view" aria-live="polite"/></main>
  </EngineBoundary>;
}
