import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";

import styles from "./ProgressBar.module.css";
import { type ProgressBarProps } from "./ProgressBar.types.ts";
import { Show } from 'solid-js';
export function ProgressBar(props: ProgressBarProps): JSX.Element {
    const value = () => Number.isFinite(props.total) && Number.isFinite(props.current) && props.total > 0
        ? Math.round(Math.max(0, Math.min(1, props.current / props.total)) * 100)
        : null;
    return (<div class={clsx(styles.root, props.className)}>
      <Show when={value()} keyed fallback={<div class={clsx(styles.bar, styles.intermediate)} style={{ "inline-size": "100%" }}/>}>
        {(percent) => <div class={clsx(styles.bar, styles.determined)} style={{ "inline-size": `${percent}%` }}/>}
      </Show>
    </div>);
}
