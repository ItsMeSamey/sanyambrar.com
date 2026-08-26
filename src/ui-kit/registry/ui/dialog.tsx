import * as D from '@kobalte/core/dialog'
import { splitProps, type ComponentProps } from 'solid-js'
import { cn } from '~/lib/utils'

export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogHeader = (props: ComponentProps<'div'>) => <div {...props} />
export const DialogFooter = (props: ComponentProps<'div'>) => <div {...props} />

export function DialogContent(props: ComponentProps<typeof D.Content>) {
  const [local, rest] = splitProps(props, ['class'])
  return <D.Portal>
    <D.Overlay class='samey-dialog-overlay fixed inset-0 z-50 bg-black/50' />
    <D.Content class={cn('samey-dialog fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 border bg-background shadow-lg', local.class)} {...rest} />
  </D.Portal>
}
