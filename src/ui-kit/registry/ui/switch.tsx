import * as SwitchPrimitive from '@kobalte/core/switch'
import { splitProps, type ComponentProps } from 'solid-js'
import { cn } from '~/lib/utils'

export const Switch = SwitchPrimitive.Root
export const SwitchLabel = SwitchPrimitive.Label

export function SwitchControl(props: ComponentProps<typeof SwitchPrimitive.Control>) {
  const [local, rest] = splitProps(props, ['class'])
  return <SwitchPrimitive.Control
    class={cn('group inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-input bg-secondary p-0.5 transition-colors data-[checked]:border-primary data-[checked]:bg-primary', local.class)}
    {...rest}
  />
}

export function SwitchThumb(props: ComponentProps<typeof SwitchPrimitive.Thumb>) {
  const [local, rest] = splitProps(props, ['class'])
  return <SwitchPrimitive.Thumb
    class={cn('pointer-events-none block size-3.5 rounded-full bg-background shadow-sm transition-transform duration-150 group-data-[checked]:translate-x-4', local.class)}
    {...rest}
  />
}
