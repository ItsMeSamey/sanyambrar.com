import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import * as styles from "./ProgressBar.module.css";
import { type ProgressBarProps } from "./ProgressBar.types.ts";
import { Show } from 'solid-js';
export function ProgressBar(solidProps: ProgressBarProps): ReactNode {
    const value = () => Number.isFinite(solidProps.total) && Number.isFinite(solidProps.current) && solidProps.total > 0
        ? Math.round(Math.max(0, Math.min(1, solidProps.current / solidProps.total)) * 100)
        : null;
    return (<div class={clsx(styles.root, solidProps.className)}>
      <Show when={value()} keyed fallback={<div class={clsx(styles.bar, styles.intermediate)} style={{ "inline-size": "100%" }}/>}>
        {(percent) => <div class={clsx(styles.bar, styles.determined)} style={{ "inline-size": `${percent}%` }}/>}
      </Show>
    </div>);
}
