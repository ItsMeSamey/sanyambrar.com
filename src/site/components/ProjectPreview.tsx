import { createSignal, createUniqueId, onCleanup, onSettled, Show } from 'solid-js';
import type { Entry } from '../data.ts';
import { ArrowUpRight, CirclePlay, X } from '../../shared/components/Icons.tsx';
import { SmartLink } from '../../shared/components/NavLink.tsx';
import { ProjectDemo } from './ProjectDemo.tsx';

function PreviewBody(props:{entry:Entry;close:() => void}) {
  let panel!: HTMLDivElement;
  onSettled(() => {
    const focusAtOpen = document.activeElement;
    // The host's hidden state must commit before measuring. Reveal the leading
    // controls independently of the lazy demo's eventual height.
    const frame = requestAnimationFrame(() => {
      if (!panel.isConnected || !panel.getClientRects().length) return;
      const focused = document.activeElement;
      if (focused !== focusAtOpen && focused !== document.body && !panel.contains(focused)) return;
      const rect = panel.getBoundingClientRect();
      const topInset = parseFloat(getComputedStyle(panel).scrollMarginTop) || 0;
      const leadingHeight = Math.min(360, innerHeight / 2);
      panel.focus({ preventScroll:true });
      if (rect.top < topInset || rect.top + leadingHeight > innerHeight) {
        panel.scrollIntoView({ block:'start', inline:'nearest', behavior:'instant' });
      }
    });
    return () => cancelAnimationFrame(frame);
  });
  return <div ref={panel} class="project-preview" role="region" aria-label={`${props.entry.title} demo`} tabindex="-1">
    <div class="project-preview-actions">
      <SmartLink href={props.entry.href} documentPreload={true}>Open {props.entry.title}<ArrowUpRight aria-hidden="true"/></SmartLink>
      <button type="button" onClick={props.close} aria-label={`Close ${props.entry.title} demo`}><X aria-hidden="true"/>Close</button>
    </div>
    <Show when={props.entry.demoId}>{id => <ProjectDemo id={id()}/>}</Show>
  </div>;
}

/** At most one demo is mounted in each project collection. */
export function createProjectPreview() {
  const [active, setActive] = createSignal<Entry | null>(null);
  const id = `project-preview-${createUniqueId()}`;
  let trigger:HTMLButtonElement | undefined;
  let restoreFrame = 0;
  const cancelRestore = () => {
    if (restoreFrame) cancelAnimationFrame(restoreFrame);
    restoreFrame = 0;
  };
  onCleanup(cancelRestore);
  const close = () => {
    const opener = trigger;
    const focusAtClose = document.activeElement;
    cancelRestore();
    setActive(null);
    restoreFrame = requestAnimationFrame(() => {
      restoreFrame = 0;
      if (!opener?.isConnected) return;
      const focused = document.activeElement;
      if (focused !== focusAtClose && focused !== document.body && focused !== opener) return;
      const rect = opener.getBoundingClientRect();
      const topInset = parseFloat(getComputedStyle(opener).scrollMarginTop) || 0;
      opener.focus({ preventScroll:true });
      if (rect.top < topInset || rect.bottom > innerHeight) {
        opener.scrollIntoView({ block:'nearest', inline:'nearest', behavior:'instant' });
      }
    });
  };
  return {
    button: (entry:Entry) => <Show when={entry.demoId}>
      <button
        class="project-try"
        type="button"
        style={{ 'scroll-margin-top':'calc(var(--site-topbar-height) + 12px)' }}
        aria-label={`${active()?.href === entry.href ? 'Close' : 'Try'} ${entry.title} demo`}
        aria-controls={id}
        aria-expanded={active()?.href === entry.href ? 'true' : 'false'}
        onClick={event => {
          cancelRestore();
          trigger = event.currentTarget;
          if (active()?.href === entry.href) close();
          else setActive(entry);
        }}
      ><CirclePlay aria-hidden="true"/>{active()?.href === entry.href ? 'Close' : 'Try'}</button>
    </Show>,
    panel: <div id={id} class="project-preview-host" hidden={!active()}>
      <Show when={active()} keyed>{entry => <PreviewBody entry={entry} close={close}/>}</Show>
    </div>,
  };
}
