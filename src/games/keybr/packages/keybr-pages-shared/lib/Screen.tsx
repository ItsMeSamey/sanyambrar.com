import type { JSX } from "@solidjs/web";
import { type ClassName } from "@keybr/widget";
import { clsx } from "clsx";

import * as styles from "./Screen.module.css";
export function Screen(solidProps: {
    readonly className?: ClassName;
    readonly children?: JSX.Element;
}): JSX.Element {
    return (<section class={clsx(styles.screen, solidProps.className)}>{solidProps.children}</section>);
}
