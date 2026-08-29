import { ProgressBar } from "@keybr/widget";
import { type ReactNode } from "@keybr/solid-compat/react";
import * as styles from "./LoadingProgress.module.css";
export function LoadingProgress(solidProps: {
    readonly total?: number;
    readonly current?: number;
}): ReactNode {
    return (<div class={styles.root}>
      <ProgressBar total={(solidProps.total === undefined ? 0 : solidProps.total)} current={(solidProps.current === undefined ? 0 : solidProps.current)}/>
    </div>);
}
