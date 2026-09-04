import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import { Dynamic } from "solid-js/web";
import * as styles from "./Description.module.css";
import { type DescriptionProps } from "./Description.types.ts";
export function Description(props: DescriptionProps): ReactNode {
    return (<Dynamic component={(props.as ?? "p")} id={props.id} class={clsx(styles.root, props.className)} title={props.title}>
      {props.children}
    </Dynamic>);
}
