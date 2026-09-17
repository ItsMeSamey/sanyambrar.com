import * as D from '@kobalte/core/dialog'
import { omit } from 'solid-js';
import { type ComponentProps } from '@solidjs/web';

export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogTitle = D.Title
export const DialogDescription = D.Description

export function DialogContent(props: D.DialogContentProps & ComponentProps<'div'>) {
  const local = props, rest = omit(props, 'class')
  return <D.Portal>
    <D.Overlay data-samey-overlay-backdrop='' class='samey-dialog-overlay' />
    <D.Content data-samey-overlay='' class={['samey-dialog', local.class]} {...rest} />
  </D.Portal>
}
