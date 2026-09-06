import { Settings } from './lucide.tsx';
import { type ComponentProps } from '@solidjs/web';

type P = ComponentProps<'svg'>
export const IconSettings = (props: P) => <Settings {...props} class={['size-4', props.class]} aria-hidden={props['aria-label'] ? undefined : 'true'} />
