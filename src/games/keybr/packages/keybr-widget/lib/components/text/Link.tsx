import { type ReactNode } from "@keybr/solid-compat/react";
import { Dynamic } from "solid-js/web";
import { type LinkProps } from "./Link.types.ts";
import { splitProps, mergeProps } from "solid-js";

export function Link(solidAllProps: LinkProps): ReactNode {
    const solidMergedProps = mergeProps({ as: "a" }, solidAllProps);
    const [solidLocal, props] = splitProps(solidMergedProps, ["as", "id", "className", "href", "target", "download", "title", "children"]);
    return (<Dynamic component={solidLocal.as as any} {...props} id={solidLocal.id} class={solidLocal.className} href={solidLocal.href} target={solidLocal.target} download={solidLocal.download} title={solidLocal.title}>
      {solidLocal.children}
    </Dynamic>);
}
