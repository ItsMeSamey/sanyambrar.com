import * as SwitchPrimitive from '@kobalte/core/switch'
import { splitProps, type ComponentProps } from 'solid-js'
import { cx } from '~/lib/classes'

export const Switch = SwitchPrimitive.Root
export const SwitchLabel = SwitchPrimitive.Label

export function SwitchControl(props: ComponentProps<typeof SwitchPrimitive.Control>) {
  const [local, rest] = splitProps(props, ['class'])
  return <SwitchPrimitive.Control
    class={cx('samey-switch-control', local.class)}
    {...rest}
  />
}

export function SwitchThumb(props: ComponentProps<typeof SwitchPrimitive.Thumb>) {
  const [local, rest] = splitProps(props, ['class'])
  return <SwitchPrimitive.Thumb
    class={cx('samey-switch-thumb', local.class)}
    {...rest}
  />
}
