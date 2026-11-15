import { createSignal, createUniqueId, onSettled, Show } from 'solid-js';
import type { Entry } from '../data.ts';
import { ArrowUpRight, CirclePlay, X } from '../../shared/components/Icons.tsx';
import { SmartLink } from '../../shared/components/NavLink.tsx';
import { ProjectDemo } from './ProjectDemo.tsx';

function PreviewBody(props:{entry:Entry;close:() => void}) {
  let panel!: HTMLDivElement;
  onSettled(() => {
    panel.focus({ preventScroll:true });
    panel.scrollIntoView({ block:'nearest' });
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
  const close = () => {
    setActive(null);
    queueMicrotask(() => trigger?.focus({ preventScroll:true }));
  };
  return {
    button: (entry:Entry) => <Show when={entry.demoId}>
      <button
        class="project-try"
        type="button"
        aria-label={`${active()?.href === entry.href ? 'Close' : 'Try'} ${entry.title} demo`}
        aria-controls={id}
        aria-expanded={active()?.href === entry.href ? 'true' : 'false'}
        onClick={event => {
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
