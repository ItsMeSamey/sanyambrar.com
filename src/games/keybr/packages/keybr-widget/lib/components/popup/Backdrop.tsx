import { type ReactNode } from "@keybr/solid-compat/react";
import * as styles from "./Backdrop.module.css";
export function Backdrop(solidProps: {
    readonly children: ReactNode;
}): ReactNode {
    return <div class={styles.root} data-samey-overlay-backdrop="">{solidProps.children}</div>;
}
