import { createContext, type ReactElement, type ReactNode, useContext, } from "@keybr/solid-compat/react";
import { state, type Toast } from "./state.ts";
export type ToastContextValue = {
    readonly close: () => void;
    readonly hover: (over: boolean) => void;
    readonly click: () => void;
};
export const ToastContext = createContext<ToastContextValue>(null!);
export function ToastProvider(solidProps: {
    readonly toast: Toast;
    readonly render: () => ReactNode;
}): ReactNode {
    return (<ToastContext value={{
            close: () => {
                state.close(solidProps.toast);
            },
            hover: (over) => {
                if (solidProps.toast.options.autoClose && solidProps.toast.options.pauseOnHover) {
                    state.retain(solidProps.toast, over);
                }
            },
            click: () => {
                if (solidProps.toast.options.closeOnClick) {
                    state.close(solidProps.toast);
                }
            },
        }}>
      {solidProps.render()}
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
export function ToastWrapper(solidProps: {
    readonly children: ReactElement;
}): ReactNode {
    // Alert and Award bind toast interactions themselves through useToast().
    // React-style element cloning is not available in Solid and attempting to
    // inspect children.props here breaks because children are already DOM nodes.
    return solidProps.children;
}
