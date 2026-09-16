import type { JSX } from "@solidjs/web";
import { Dynamic } from '@solidjs/web';
import { type LinkProps } from "./Link.types.ts";
import { omit, merge } from 'solid-js';

export function Link(allProps: LinkProps): JSX.Element {
    const mergedProps = merge(allProps, { get as() { return allProps.as ?? "a"; } });
    const local = mergedProps, props = omit(mergedProps, "as", "id", "className", "href", "target", "download", "title", "children");
    return (<Dynamic component={local.as} {...props} id={local.id} class={local.className} href={local.href} target={local.target} download={local.download} title={local.title}>
      {local.children}
    </Dynamic>);
}
