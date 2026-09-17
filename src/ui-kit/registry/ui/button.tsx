import { type JSX } from '@solidjs/web';

export function Button(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} type={props.type ?? 'button'} class={['ui-button', 'ui-button-default', 'ui-button-md', props.class]} />
}
