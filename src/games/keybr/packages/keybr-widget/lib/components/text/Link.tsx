import { type ReactNode } from "@keybr/solid-compat/react";
import { Dynamic } from '@solidjs/web';
import { type LinkProps } from "./Link.types.ts";
import { omit, merge } from 'solid-js';

export function Link(solidAllProps: LinkProps): ReactNode {
    const solidMergedProps = merge(solidAllProps, { get as() { return solidAllProps.as ?? "a"; } });
    const solidLocal = solidMergedProps, props = omit(solidMergedProps, "as", "id", "className", "href", "target", "download", "title", "children");
    return (<Dynamic component={solidLocal.as} {...props} id={solidLocal.id} class={solidLocal.className} href={solidLocal.href} target={solidLocal.target} download={solidLocal.download} title={solidLocal.title}>
      {solidLocal.children}
    </Dynamic>);
}
