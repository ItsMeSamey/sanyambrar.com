import * as T from '@kobalte/core/toggle-group'; import { splitProps, type ComponentProps } from 'solid-js'; import { cn } from '~/lib/utils'; import { toggleVariants } from './toggle'
export const ToggleGroup=T.Root; export function ToggleGroupItem(props:ComponentProps<typeof T.Item>){const[l,o]=splitProps(props,['class']);return <T.Item class={cn(toggleVariants(), 'group', l.class)} {...o}/>}
