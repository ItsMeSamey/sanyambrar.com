import type { JSX } from "@solidjs/web";
import { onCleanup, onSettled, Show } from 'solid-js';
import styles from "./LoadingProgress.module.css";
export function LoadingProgress(props: {
    readonly total?: number;
    readonly current?: number;
}): JSX.Element {
    let releaseLoading = () => {};
    onSettled(() => {
      releaseLoading = globalThis.SameyLoadingBegin?.() ?? (() => {});
    });
    onCleanup(() => releaseLoading());
    const value = () => Number.isFinite(props.total) && Number.isFinite(props.current) && (props.total ?? 0) > 0
      ? Math.round(Math.max(0, Math.min(1, (props.current ?? 0) / (props.total ?? 1))) * 100)
      : null;
    return (<div class={styles.root}>
      <div class={styles.progress}>
        <Show when={value()} keyed fallback={<div class={`${styles.bar} ${styles.intermediate}`} style={{ "inline-size": "100%" }}/>}>
          {(percent) => <div class={`${styles.bar} ${styles.determined}`} style={{ "inline-size": `${percent}%` }}/>}
        </Show>
      </div>
    </div>);
}
