import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import { Dynamic } from "solid-js/web";
import * as styles from "./Description.module.css";
import { type DescriptionProps } from "./Description.types.ts";

export function Description(props: DescriptionProps): ReactNode {
    const { as: component = "p", id, title, className, children } = props;
    return (<Dynamic component={component as any} id={id} class={clsx(styles.root, className)} title={title}>
      {children}
    </Dynamic>);
}
