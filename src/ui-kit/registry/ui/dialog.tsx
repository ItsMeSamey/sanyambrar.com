import * as D from '@kobalte/core/dialog'
import { omit } from 'solid-js';
import { type ComponentProps } from '@solidjs/web';

export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogTitle = D.Title
export const DialogDescription = D.Description
export const DialogHeader = (props: ComponentProps<'div'>) => <div {...props} />
export const DialogFooter = (props: ComponentProps<'div'>) => <div {...props} />

export function DialogContent(props: Omit<D.DialogContentProps, 'class' | 'onKeyDown'> & ComponentProps<'div'>) {
  const local = props, rest = omit(props, 'class', 'onKeyDown')
  const context = D.useDialogContext()
  return <D.Portal>
    <D.Overlay data-samey-overlay-backdrop='' class='samey-dialog-overlay' />
    <D.Content data-samey-overlay='' class={['samey-dialog', local.class]} {...rest} onKeyDown={(event: KeyboardEvent & {currentTarget: HTMLDivElement; target: Element}) => {
      const handler = props.onKeyDown
      if (typeof handler === 'function') handler(event)
      else if (handler) handler[0](handler[1], event)
      if (event.key !== 'Escape' || event.defaultPrevented) return
      props.onEscapeKeyDown?.(event)
      if (event.defaultPrevented) return
      event.preventDefault()
      event.stopPropagation()
      context.close()
    }} />
  </D.Portal>
}
