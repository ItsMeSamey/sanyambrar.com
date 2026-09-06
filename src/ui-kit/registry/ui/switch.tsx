import type { ComponentProps } from '@solidjs/web';
import * as SwitchPrimitive from '@kobalte/core/switch'
import { omit } from 'solid-js';

export const Switch = SwitchPrimitive.Root
export const SwitchInput = SwitchPrimitive.Input
export const SwitchLabel = SwitchPrimitive.Label

export function SwitchControl(props: SwitchPrimitive.SwitchControlProps & ComponentProps<'div'>) {
  const local = props, rest = omit(props, 'class')
  return <SwitchPrimitive.Control
    class={['samey-switch-control', local.class]}
    {...rest}
  />
}

export function SwitchThumb(props: SwitchPrimitive.SwitchThumbProps & ComponentProps<'div'>) {
  const local = props, rest = omit(props, 'class')
  return <SwitchPrimitive.Thumb
    class={['samey-switch-thumb', local.class]}
    {...rest}
  />
}
