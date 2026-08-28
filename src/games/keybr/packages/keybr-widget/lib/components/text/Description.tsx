import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import * as styles from "./Description.module.css";
import { type DescriptionProps } from "./Description.types.ts";
export function Description(props: DescriptionProps): ReactNode {
    const { as: Component = "p", id, title, className, children } = props;
    return (<Component id={id} class={clsx(styles.root, className)} title={title}>
      {children}
    </Component>);
}
