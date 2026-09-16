import { omit } from 'solid-js';
import { type JSX } from '@solidjs/web';

type Variant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
type Size = 'default' | 'sm' | 'lg' | 'icon'
const variantClass: Record<Variant, string> = {
  default: 'ui-button-default', outline: 'ui-button-outline', secondary: 'ui-button-secondary',
  ghost: 'ui-button-ghost', destructive: 'ui-button-destructive', link: 'ui-button-link',
}
const sizeClass: Record<Size, string> = { default: 'ui-button-md', sm: 'ui-button-sm', lg: 'ui-button-lg', icon: 'ui-button-icon' }

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }

export function Button(props: ButtonProps) {
  const local = props, rest = omit(props, 'variant', 'size', 'class', 'type')
  return <button type={local.type ?? 'button'} class={['ui-button', variantClass[local.variant ?? 'default'], sizeClass[local.size ?? 'default'], local.class]} {...rest}/>
}
