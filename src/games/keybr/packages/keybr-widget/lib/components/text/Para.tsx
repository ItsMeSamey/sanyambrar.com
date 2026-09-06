import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import { Dynamic } from '@solidjs/web';
import { alignClassName } from "../../styles/index.ts";
import { type ParaProps } from "./Para.types.ts";
export function Para(props: ParaProps): ReactNode {
    return (<Dynamic component={(props.as ?? "p")} id={props.id} title={props.title} class={clsx(alignClassName(props.align), props.className)}>
      {props.children}
    </Dynamic>);
}
