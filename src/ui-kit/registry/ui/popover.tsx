import { autoUpdate, computePosition, flip, offset, shift, type Placement } from '@floating-ui/dom';
import { createContext, createEffect, createSignal, createUniqueId, omit, useContext, type ParentProps } from 'solid-js';
import type { ComponentProps } from '@solidjs/web';

type PopoverProps = ParentProps<{ open?: boolean; onOpenChange?: (open: boolean) => void; placement?: Placement; gutter?: number; flip?: boolean | Placement }>;
const Context = createContext<ReturnType<typeof popoverState>>();
function popoverState(props: PopoverProps) {
  const [internal, setInternal] = createSignal(false);
  const [trigger, setTrigger] = createSignal<HTMLButtonElement>();
  const open = () => props.open ?? internal();
  return { id: createUniqueId(), props, trigger, setTrigger, open, setOpen(value: boolean) {
    setInternal(value);
    props.onOpenChange?.(value);
  } };
}
function context() {
  const value = useContext(Context);
  if (!value) throw new Error('Popover parts require a Popover parent');
  return value;
}
export function Popover(props: PopoverProps) {
  return <Context value={popoverState(props)}>{props.children}</Context>;
}
export function PopoverTrigger(props: ComponentProps<'button'>) {
  const state = context();
  const onClick = props.onClick;
  return <button type='button' {...omit(props, 'onClick')} ref={element => { state.setTrigger(element); }} aria-haspopup='dialog' aria-controls={state.id} aria-expanded={state.open() ? 'true' : 'false'} data-expanded={state.open() ? '' : undefined}
    onClick={event => {
      if (typeof onClick === 'function') onClick(event);
      if (!event.defaultPrevented) state.setOpen(!state.open());
    }} />;
}

// Native dismissal/focus behavior, framework-neutral geometry. Kobalte's RC
// positioner currently leaves these overlays at (0, 0).
export function PopoverContent(props: ComponentProps<'div'>) {
  const state = context();
  let element!: HTMLDivElement;
  createEffect(() => ({ open: state.open(), trigger: state.trigger(), placement: state.props.placement ?? 'bottom', gutter: state.props.gutter ?? 6, flip: state.props.flip }), value => {
    if (!element.isConnected) return;
    if (value.open !== element.matches(':popover-open')) {
      if (value.open) element.showPopover();
      else element.hidePopover();
    }
    if (!value.open || !value.trigger) return;
    let active = true, sequence = 0;
    element.style.visibility = 'hidden';
    const middleware = [offset(value.gutter), ...(value.flip === false ? [] : [flip({ padding: 8, fallbackPlacements: typeof value.flip === 'string' ? [value.flip] : undefined })]), shift({ padding: 8, crossAxis: true })];
    const cleanup = autoUpdate(value.trigger, element, () => {
      const current = ++sequence;
      void computePosition(value.trigger!, element, { strategy: 'fixed', placement: value.placement, middleware }).then(position => {
        if (!active || current !== sequence) return;
        Object.assign(element.style, { left: `${position.x}px`, top: `${position.y}px`, visibility: 'visible' });
      }).catch((error: unknown) => { if (active) console.error('Could not position popover', error); });
    });
    return () => { active = false; cleanup(); };
  });
  return <div {...omit(props, 'class', 'style', 'ref')} ref={element} id={state.id} popover='auto' role='dialog' tabindex={-1}
    data-samey-overlay='' data-expanded={state.open() ? '' : undefined} class={['samey-popover', props.class].filter(Boolean).join(' ')}
    style={{ position: 'fixed', inset: 'auto', margin: '0', 'max-width': 'calc(100vw - 16px)', 'max-height': 'calc(100dvh - 16px)', overflow: 'auto' }}
    onBeforeToggle={event => {
      const next = event.newState === 'open';
      if (next !== state.open()) state.setOpen(next);
    }} />;
}
