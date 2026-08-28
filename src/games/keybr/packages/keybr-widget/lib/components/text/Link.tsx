import { type ReactNode } from "@keybr/solid-compat/react";
import { Dynamic } from "solid-js/web";
import { type LinkProps } from "./Link.types.ts";

export function Link({ as: component = "a", id, className, href, target, download, title, children, ...props }: LinkProps): ReactNode {
    return (<Dynamic component={component as any} {...props} id={id} class={className} href={href} target={target} download={download} title={title}>
      {children}
    </Dynamic>);
}
