import * as D from '@kobalte/core/dialog'
import { createEffect, omit } from 'solid-js';
import { type ComponentProps } from '@solidjs/web';

type EscapeEntry = {
  close: () => void
  onEscapeKeyDown?: (event: KeyboardEvent) => void
}

const escapeStack: EscapeEntry[] = []
const handleEscape = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  const entry = escapeStack.at(-1)
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

export function DialogContent(props: D.DialogContentProps & ComponentProps<'div'>) {
  const context = D.useDialogContext()
  const local = props, rest = omit(props, 'class', 'onEscapeKeyDown')
  const entry: EscapeEntry = { close: context.close, onEscapeKeyDown: event => local.onEscapeKeyDown?.(event) }
  createEffect(context.isOpen, open => open ? registerEscape(entry) : undefined)
  return <D.Portal>
    <D.Overlay data-samey-overlay-backdrop='' class='samey-dialog-overlay' />
    <D.Content data-samey-overlay='' class={['samey-dialog', local.class]} {...rest} />
  </D.Portal>
}
