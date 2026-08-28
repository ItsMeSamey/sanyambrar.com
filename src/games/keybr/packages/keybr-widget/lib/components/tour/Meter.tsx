import { clsx } from "@keybr/solid-compat/clsx";
import * as styles from "./Meter.module.css";
export function Meter({ length, slideIndex, }: {
    readonly length: number;
    readonly slideIndex: number;
}) {
    return (<div class={styles.root}>
      {new Array(length).fill(null).map((slide, index) => (<span class={clsx(styles.item, slideIndex === index && styles.current)}/>))}
    </div>);
}
