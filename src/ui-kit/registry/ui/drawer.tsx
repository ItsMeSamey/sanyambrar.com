import type { ComponentProps } from 'solid-js'
import { Dialog, DialogContent } from './dialog'

export const Drawer = Dialog
export const DrawerContent = DialogContent
export const DrawerHeader = (props: ComponentProps<'div'>) => <div {...props} />
export const DrawerTitle = (props: ComponentProps<'h2'>) => <h2 {...props} />
export const DrawerDescription = (props: ComponentProps<'p'>) => <p {...props} />
