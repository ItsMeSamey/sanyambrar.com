import "./Box.module.css";
import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import { Dynamic } from "solid-js/web";
import { type BoxProps } from "./Box.types.ts";
import { getBoxClassNames } from "./classNames.ts";

export function Box(props: BoxProps): ReactNode {
    return (<Dynamic component={(props.as ?? "div")} id={props.id} class={clsx(getBoxClassNames(props), props.className)} title={props.title}>
      {props.children}
    </Dynamic>);
}
