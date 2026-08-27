import * as TooltipPrimitive from '@kobalte/core/tooltip'
import { splitProps, type ComponentProps } from 'solid-js'
import { cx } from '~/lib/classes'

export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export function TooltipContent(props: ComponentProps<typeof TooltipPrimitive.Content>) {
  const [local, rest] = splitProps(props, ['class'])
  return <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      class={cx('z-50 rounded-md border border-border/40 bg-foreground px-2.5 py-1.5 text-xs text-background shadow-lg', local.class)}
      {...rest}
    />
  </TooltipPrimitive.Portal>
}
