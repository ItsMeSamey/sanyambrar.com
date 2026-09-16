import { type ComponentProps } from '@solidjs/web';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './dialog'

export const Drawer = Dialog
export const DrawerContent = DialogContent
export const DrawerHeader = (props: ComponentProps<'div'>) => <div {...props} />
export const DrawerTitle = DialogTitle
export const DrawerDescription = DialogDescription
