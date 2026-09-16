import type { JSX } from "@solidjs/web";
import * as styles from "./Backdrop.module.css";
export function Backdrop(solidProps: {
    readonly children: JSX.Element;
}): JSX.Element {
    return <div class={styles.root} data-samey-overlay-backdrop="">{solidProps.children}</div>;
}
