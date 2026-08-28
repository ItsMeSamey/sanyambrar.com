import Settings from 'lucide-solid/icons/settings'
import type { ComponentProps } from 'solid-js'
import { cx } from '~/lib/classes'

type P = ComponentProps<'svg'>
export const IconSettings = (props: P) => <Settings {...props} class={cx('size-4', props.class)} aria-hidden={props['aria-label'] ? undefined : 'true'} />
