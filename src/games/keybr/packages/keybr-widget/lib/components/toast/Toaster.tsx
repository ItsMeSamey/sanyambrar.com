import { type ReactElement, type ReactNode, useEffect, useState } from "@keybr/solid-compat/react";
import { ToastProvider, ToastWrapper } from "./context.tsx";
import { state, Toast } from "./state.ts";
import * as styles from "./Toaster.module.css";
import { type ToastOptions } from "./types.ts";
export function Toaster(): ReactNode {
    const [toasts, setToasts] = useState(state.toasts);
    useEffect(() => state.listen(setToasts), () => [toasts()]);
    return (<div class={styles.toaster} hidden={toasts().length === 0}>
      {[...toasts()].reverse().map((toast) => (<ToastProvider toast={toast}>
          <ToastWrapper>{toast.message}</ToastWrapper>
        </ToastProvider>))}
    </div>);
}
export function toast(message: ReactElement<any>, { autoClose = 3000, pauseOnHover = true, closeOnClick = true, }: Partial<ToastOptions> = {}): void {
    state.add(new Toast(message, { autoClose, pauseOnHover, closeOnClick }));
}
