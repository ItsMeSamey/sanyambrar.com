import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import { Dynamic } from "solid-js/web";
import { alignClassName } from "../../styles/index.ts";
import { type ParaProps } from "./Para.types.ts";

export function Para(props: ParaProps): ReactNode {
    const { as: component = "p", id, title, className, children, align } = props;
    return (<Dynamic component={component as any} id={id} class={clsx(alignClassName(align), className)} title={title}>
      {children}
    </Dynamic>);
}
