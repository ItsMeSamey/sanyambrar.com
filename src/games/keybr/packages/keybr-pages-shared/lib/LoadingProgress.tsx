import { ProgressBar } from "@keybr/widget";
import { type ReactNode } from "@keybr/solid-compat/react";
import { onCleanup, onMount } from "solid-js";
import * as styles from "./LoadingProgress.module.css";
export function LoadingProgress(solidProps: {
    readonly total?: number;
    readonly current?: number;
}): ReactNode {
    let releaseLoading = () => {};
    onMount(() => {
      releaseLoading = (globalThis as typeof globalThis & { SameyLoadingBegin?: () => () => void }).SameyLoadingBegin?.() ?? (() => {});
    });
    onCleanup(() => releaseLoading());
    return (<div class={styles.root}>
      <ProgressBar total={(solidProps.total === undefined ? 0 : solidProps.total)} current={(solidProps.current === undefined ? 0 : solidProps.current)}/>
    </div>);
}
