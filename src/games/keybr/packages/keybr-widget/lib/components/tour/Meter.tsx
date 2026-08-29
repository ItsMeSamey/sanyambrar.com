import { clsx } from "@keybr/solid-compat/clsx";
import * as styles from "./Meter.module.css";
export function Meter(solidProps: {
    readonly length: number;
    readonly slideIndex: number;
}) {
    return (<div class={styles.root}>
      {new Array(solidProps.length).fill(null).map((slide, index) => (<span class={clsx(styles.item, solidProps.slideIndex === index && styles.current)}/>))}
    </div>);
}
