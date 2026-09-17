import type { JSX } from "@solidjs/web";
import styles from "./ChartWrapper.module.css";
export function ChartWrapper(props: {
    children: JSX.Element;
}) {
    return <div class={styles.root}>{props.children}</div>;
}
