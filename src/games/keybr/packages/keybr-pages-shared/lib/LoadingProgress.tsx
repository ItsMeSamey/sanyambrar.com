import { ProgressBar } from "@keybr/widget";
import { type ReactNode } from "@keybr/solid-compat/react";
import * as styles from "./LoadingProgress.module.css";
export function LoadingProgress({ total = 0, current = 0, }: {
    readonly total?: number;
    readonly current?: number;
}): ReactNode {
    return (<div class={styles.root}>
      <ProgressBar total={total} current={current}/>
    </div>);
}
