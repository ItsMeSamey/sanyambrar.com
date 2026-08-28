import "./Box.module.css";
import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import { type BoxProps, type HBoxProps, type VBoxProps } from "./Box.types.ts";
import { getBoxClassNames } from "./classNames.ts";
export function Box(props: BoxProps): ReactNode {
    const { as: Component = "div", className, id, title, children } = props;
    return (<Component id={id} class={clsx(getBoxClassNames(props), className)} title={title}>
      {children}
    </Component>);
}
