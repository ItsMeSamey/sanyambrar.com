import type { ComponentProps } from '@solidjs/web';
import * as P from '@kobalte/core/popover'
import { omit } from 'solid-js';

export const Popover = P.Root
export const PopoverTrigger = P.Trigger

export function PopoverContent(props: Omit<P.PopoverContentProps, 'class' | 'onKeyDown'> & ComponentProps<'div'>) {
  const local = props, rest = omit(props, 'class', 'onKeyDown')
  const context = P.usePopoverContext()
  return <P.Portal>
    <P.Content data-samey-overlay='' class={['samey-popover', local.class]} {...rest} onKeyDown={(event: KeyboardEvent & {currentTarget: HTMLDivElement; target: Element}) => {
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
  </P.Portal>
}
