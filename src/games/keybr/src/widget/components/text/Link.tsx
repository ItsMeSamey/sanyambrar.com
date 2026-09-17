import type { JSX } from "@solidjs/web";
import { Dynamic } from '@solidjs/web';
import type { ValidComponent } from "@solidjs/web";
import { type ClassName, type MouseProps } from "../types.ts";
type LinkProps = {
    readonly as?: ValidComponent;
    readonly className?: ClassName;
    readonly id?: string;
    readonly href?: string;
    readonly target?: string;
    readonly download?: string;
    readonly title?: string;
    readonly children?: JSX.Element;
} & MouseProps;
import { omit, merge } from 'solid-js';

export function Link(allProps: LinkProps): JSX.Element {
    const mergedProps = merge(allProps, { get as() { return allProps.as ?? "a"; } });
    const local = mergedProps, props = omit(mergedProps, "as", "id", "className", "href", "target", "download", "title", "children");
    return (<Dynamic component={local.as} {...props} id={local.id} class={local.className} href={local.href} target={local.target} download={local.download} title={local.title}>
      {local.children}
    </Dynamic>);
}
