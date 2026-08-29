import { type ReactNode } from "@keybr/solid-compat/react";
import * as styles from "./ChartWrapper.module.css";
export function ChartWrapper(solidProps: {
    children: ReactNode;
}) {
    return <div class={styles.root}>{solidProps.children}</div>;
}
