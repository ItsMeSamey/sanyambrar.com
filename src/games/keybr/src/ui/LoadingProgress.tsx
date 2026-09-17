import type { JSX } from "@solidjs/web";
import { ProgressBar } from "@keybr/widget";

import { onCleanup, onSettled } from 'solid-js';
import * as styles from "./LoadingProgress.module.css";
export function LoadingProgress(props: {
    readonly total?: number;
    readonly current?: number;
}): JSX.Element {
    let releaseLoading = () => {};
    onSettled(() => {
      releaseLoading = globalThis.SameyLoadingBegin?.() ?? (() => {});
    });
    onCleanup(() => releaseLoading());
    return (<div class={styles.root}>
      <ProgressBar total={(props.total === undefined ? 0 : props.total)} current={(props.current === undefined ? 0 : props.current)}/>
    </div>);
}
