import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import { type LinkProps } from "./Link.types.ts";
export function Link({ as: Component = "a", id, className, href, target, download, title, children, ...props }: LinkProps): ReactNode {
    return (<Component {...props} id={id} class={className} href={href} target={target} download={download} title={title}>
      {children}
    </Component>);
}
