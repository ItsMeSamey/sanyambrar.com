import * as D from '@kobalte/core/dialog'
import { omit } from 'solid-js';
import { type ComponentProps, type JSX } from '@solidjs/web';

export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogTitle = D.Title
export const DialogDescription = D.Description

export function DialogContent(props: D.DialogContentProps & ComponentProps<'div'>) {
  const context = D.useDialogContext()
  const local = props, rest = omit(props, 'class', 'onKeyDown', 'onEscapeKeyDown')
  const onKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = event => {
    const handler = local.onKeyDown
    if (typeof handler === 'function') handler(event)
    if (event.key !== 'Escape' || event.defaultPrevented) return
    local.onEscapeKeyDown?.(event)
    if (event.defaultPrevented) return
    event.preventDefault()
    context.close()
  }
  return <D.Portal>
    <D.Overlay data-samey-overlay-backdrop='' class='samey-dialog-overlay' />
    <D.Content data-samey-overlay='' class={['samey-dialog', local.class]} {...rest} onKeyDown={onKeyDown} />
  </D.Portal>
}
