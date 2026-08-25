import * as P from '@kobalte/core/popover'; import { splitProps, type ComponentProps } from 'solid-js'; import { cn } from '~/lib/utils'
export const Popover=P.Root; export const PopoverTrigger=P.Trigger;
export function PopoverContent(props: ComponentProps<typeof P.Content>){const[l,o]=splitProps(props,['class']);return <P.Portal><P.Content class={cn('z-50 rounded-md border bg-popover p-4 text-popover-foreground shadow-md',l.class)} {...o}/></P.Portal>}
