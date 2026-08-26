import * as P from '@kobalte/core/popover'
import { splitProps, type ComponentProps } from 'solid-js'
import { cn } from '~/lib/utils'

export const Popover = P.Root
export const PopoverTrigger = P.Trigger

export function PopoverContent(props: ComponentProps<typeof P.Content>) {
  const [local, rest] = splitProps(props, ['class'])
  return <P.Portal>
    <P.Content class={cn('samey-popover z-50 rounded-md border bg-popover p-4 text-popover-foreground shadow-md', local.class)} {...rest} />
  </P.Portal>
}
