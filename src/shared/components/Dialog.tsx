import * as D from '@kobalte/core/dialog'
import { createEffect, omit, type ParentProps } from 'solid-js';
import { type ComponentProps } from '@solidjs/web';
import { hideLayer, isTopLayer, showLayer } from '../overlay.ts';

type EscapeEntry = {
  close: () => void
  surface: () => HTMLElement | undefined
  onEscapeKeyDown?: (event: KeyboardEvent) => void
}

const escapeStack: EscapeEntry[] = []
const handleEscape = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || event.defaultPrevented) return
  const entry = [...escapeStack].reverse().find(item => isTopLayer(item.surface()))
  if (!entry) return
  entry.onEscapeKeyDown?.(event)
  if (event.defaultPrevented) return
  event.preventDefault()
  event.stopImmediatePropagation()
  entry.close()
}

function registerEscape(entry: EscapeEntry) {
  escapeStack.push(entry)
  if (escapeStack.length === 1) document.addEventListener('keydown', handleEscape)
  return () => {
    const index = escapeStack.lastIndexOf(entry)
    if (index >= 0) escapeStack.splice(index, 1)
    if (!escapeStack.length) document.removeEventListener('keydown', handleEscape)
  }
}

export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogTitle = D.Title
export const DialogDescription = D.Description

function DialogSurface(props: ParentProps<{ entry: EscapeEntry }>) {
  const context = D.useDialogContext()
  let surface!: HTMLDivElement
  props.entry.surface = () => surface
  createEffect(context.isOpen, open => {
    if (!open) return
    showLayer(surface)
    const unregister = registerEscape(props.entry)
    return () => {
      unregister()
      hideLayer(surface)
    }
  })
  return <div ref={surface} popover='manual' class='samey-dialog-layer'>{props.children}</div>
}

export function DialogContent(props: D.DialogContentProps & ComponentProps<'div'>) {
  const context = D.useDialogContext()
  const local = props, rest = omit(props, 'class', 'onEscapeKeyDown', 'onInteractOutside')
  const entry: EscapeEntry = { close: context.close, surface: () => undefined, onEscapeKeyDown: event => local.onEscapeKeyDown?.(event) }
  return <D.Portal>
    <DialogSurface entry={entry}>
      <D.Overlay data-samey-overlay-backdrop='' class='samey-dialog-overlay' />
      <D.Content data-samey-overlay='' class={['samey-dialog', local.class]} {...rest} aria-modal={context.modal() ? 'true' : undefined}
        onInteractOutside={event => {
          local.onInteractOutside?.(event)
          // Kobalte's stack cannot see newer native/runtime surfaces.
          if (!isTopLayer(entry.surface())) event.preventDefault()
        }} />
    </DialogSurface>
  </D.Portal>
}
