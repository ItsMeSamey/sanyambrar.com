import type { JSX } from "@solidjs/web";
import { type ClassName } from "../widget/components/types.ts";
import { clsx } from "clsx";

import styles from "./Screen.module.css";
export function Screen(props: {
    readonly className?: ClassName;
    readonly children?: JSX.Element;
}): JSX.Element {
    return (<section class={clsx(styles.screen, props.className)}>{props.children}</section>);
}
