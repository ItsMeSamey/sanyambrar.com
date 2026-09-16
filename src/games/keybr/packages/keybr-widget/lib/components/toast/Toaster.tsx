import { createSignal, onSettled } from 'solid-js';
import type { JSX } from "@solidjs/web";
import { ToastProvider } from "./context.tsx";
import { state, Toast } from "./state.ts";
import * as styles from "./Toaster.module.css";
import { type ToastOptions } from "./types.ts";
export function Toaster(): JSX.Element {
    const [toasts, setToasts] = createSignal(state.toasts);
    onSettled(() => state.listen(setToasts));
    return (<div class={styles.toaster} hidden={toasts().length === 0}>
      {[...toasts()].reverse().map((toast) => (<ToastProvider toast={toast} render={toast.render}/>))}
    </div>);
}
export function toast(render: () => JSX.Element, { autoClose = 3000, pauseOnHover = true, closeOnClick = true, }: Partial<ToastOptions> = {}): void {
    state.add(new Toast(render, { autoClose, pauseOnHover, closeOnClick }));
}
