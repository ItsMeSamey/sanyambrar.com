import * as P from '@kobalte/core/popover'
import { splitProps, type ComponentProps } from 'solid-js'
import { cx } from '~/lib/classes'

export const Popover = P.Root
export const PopoverTrigger = P.Trigger

export function PopoverContent(props: ComponentProps<typeof P.Content>) {
  const [local, rest] = splitProps(props, ['class'])
  return <P.Portal>
    <P.Content data-samey-overlay='' class={cx('samey-popover', local.class)} {...rest} />
  </P.Portal>
}
