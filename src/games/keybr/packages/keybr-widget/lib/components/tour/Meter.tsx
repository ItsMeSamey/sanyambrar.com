import { clsx } from "clsx";
import * as styles from "./Meter.module.css";
export function Meter(props: {
    readonly length: number;
    readonly slideIndex: number;
}) {
    return (<div class={styles.root}>
      {new Array(props.length).fill(null).map((_slide, index) => (<span class={clsx(styles.item, props.slideIndex === index && styles.current)}/>))}
    </div>);
}
