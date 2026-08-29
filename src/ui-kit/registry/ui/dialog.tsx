import * as D from '@kobalte/core/dialog'
import { splitProps, type ComponentProps } from 'solid-js'
import { cx } from '~/lib/classes'

export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogHeader = (props: ComponentProps<'div'>) => <div {...props} />
export const DialogFooter = (props: ComponentProps<'div'>) => <div {...props} />

export function DialogContent(props: ComponentProps<typeof D.Content>) {
  const [local, rest] = splitProps(props, ['class'])
  return <D.Portal>
    <D.Overlay data-samey-overlay-backdrop='' class='samey-dialog-overlay' />
    <D.Content data-samey-overlay='' class={cx('samey-dialog', local.class)} {...rest} />
  </D.Portal>
}
