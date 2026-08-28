import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import * as styles from "./ProgressBar.module.css";
import { type ProgressBarProps } from "./ProgressBar.types.ts";
export function ProgressBar({ className, total, current, }: ProgressBarProps): ReactNode {
    if (Number.isFinite(total) && Number.isFinite(current) && total > 0) {
        const value = Math.round(Math.max(0, Math.min(1, current / total)) * 100);
        return (<div class={clsx(styles.root, className)}>
        <div class={clsx(styles.bar, styles.determined)} style={{ "inline-size": `${value}%` }}/>
      </div>);
    }
    else {
        return (<div class={clsx(styles.root, className)}>
        <div class={clsx(styles.bar, styles.intermediate)} style={{ "inline-size": "100%" }}/>
      </div>);
    }
}
