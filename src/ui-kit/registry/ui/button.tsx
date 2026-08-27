import * as ButtonPrimitive from '@kobalte/core/button'
import type { PolymorphicProps } from '@kobalte/core/polymorphic'
import { splitProps, type JSX, type ValidComponent } from 'solid-js'
import { cx } from '~/lib/classes'

type Variant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
type Size = 'default' | 'sm' | 'lg' | 'icon'
const variantClass: Record<Variant, string> = {
  default: 'ui-button-default', outline: 'ui-button-outline', secondary: 'ui-button-secondary',
  ghost: 'ui-button-ghost', destructive: 'ui-button-destructive', link: 'ui-button-link',
}
const sizeClass: Record<Size, string> = { default: 'ui-button-md', sm: 'ui-button-sm', lg: 'ui-button-lg', icon: 'ui-button-icon' }

type ButtonProps<T extends ValidComponent = 'button'> = ButtonPrimitive.ButtonRootProps<T> & {
  variant?: Variant; size?: Size; class?: string; children?: JSX.Element
}

export const Button = <T extends ValidComponent = 'button'>(props: PolymorphicProps<T, ButtonProps<T>>) => {
  const [local, rest] = splitProps(props as ButtonProps, ['variant', 'size', 'class'])
  return <ButtonPrimitive.Root class={cx('ui-button', variantClass[local.variant ?? 'default'], sizeClass[local.size ?? 'default'], local.class)} {...rest} />
}
