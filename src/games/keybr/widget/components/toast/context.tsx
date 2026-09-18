import { createContext, useContext } from 'solid-js';
import type { JSX } from "@solidjs/web";

import { state, type Toast } from "./state.ts";
 type ToastContextValue = {
    readonly close: () => void;
    readonly hover: (over: boolean) => void;
    readonly click: () => void;
};
const ToastContext = createContext<ToastContextValue>(null!);
export function ToastProvider(props: {
    readonly toast: Toast;
    readonly render: () => JSX.Element;
}): JSX.Element {
    return (<ToastContext value={{
            close: () => {
                state.close(props.toast);
            },
            hover: (over) => {
                if (props.toast.options.autoClose && props.toast.options.pauseOnHover) {
                    state.retain(props.toast, over);
                }
            },
            click: () => {
                if (props.toast.options.closeOnClick) {
                    state.close(props.toast);
                }
            },
        }}>
      {props.render()}
    </ToastContext>);
}
export function useToast(): ToastContextValue {
    const value = useContext(ToastContext);
    if (value == null) {
        throw new Error(import.meta.env.MODE !== "production"
            ? "ToastContext is missing"
            : undefined);
    }
    return value;
}
export function toastProps(toast: ToastContextValue) {
    return {
        onMouseEnter: () => {
            toast.hover(true);
        },
        onMouseLeave: () => {
            toast.hover(false);
        },
        onClick: () => {
            toast.click();
        },
    };
}
