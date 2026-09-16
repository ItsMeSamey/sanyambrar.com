import type { JSX } from "@solidjs/web";
import * as styles from "./ChartWrapper.module.css";
export function ChartWrapper(solidProps: {
    children: JSX.Element;
}) {
    return <div class={styles.root}>{solidProps.children}</div>;
}
