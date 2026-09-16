import { createContext, useContext } from 'solid-js';
import type { JSX } from "@solidjs/web";

import { state, type Toast } from "./state.ts";
export type ToastContextValue = {
    readonly close: () => void;
    readonly hover: (over: boolean) => void;
    readonly click: () => void;
};
export const ToastContext = createContext<ToastContextValue>(null!);
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
        throw new Error(process.env.NODE_ENV !== "production"
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
export function ToastWrapper(props: {
    readonly children: JSX.Element;
}): JSX.Element {
    // Alert and Award bind toast interactions themselves through useToast().
    // React-style element cloning is not available in Solid and attempting to
    // inspect children.props here breaks because children are already DOM nodes.
    return props.children;
}
