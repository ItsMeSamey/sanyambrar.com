import { type ClassName } from "@keybr/widget";
import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import * as styles from "./Screen.module.css";
export function Screen(solidProps: {
    readonly className?: ClassName;
    readonly children?: ReactNode;
}): ReactNode {
    return (<section class={clsx(styles.screen, solidProps.className)}>{solidProps.children}</section>);
}
