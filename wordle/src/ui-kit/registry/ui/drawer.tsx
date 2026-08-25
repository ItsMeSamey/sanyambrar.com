import { Dialog, DialogContent } from './dialog'; import type { ComponentProps } from 'solid-js'
export const Drawer=Dialog; export const DrawerContent=DialogContent; export const DrawerHeader=(p:ComponentProps<'div'>)=><div {...p}/>; export const DrawerTitle=(p:ComponentProps<'h2'>)=><h2 {...p}/>; export const DrawerDescription=(p:ComponentProps<'p'>)=><p {...p}/>;
