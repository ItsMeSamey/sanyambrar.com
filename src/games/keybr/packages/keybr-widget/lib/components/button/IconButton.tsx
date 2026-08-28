import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode, useImperativeHandle, useRef } from "@keybr/solid-compat/react";
import { getBoundingBox } from "../../utils/index.ts";
import * as styles from "./IconButton.module.css";
import { type IconButtonProps } from "./IconButton.types.ts";
export function IconButton({ anchor, children, disabled, icon, label, ref, tabIndex, title, ...props }: IconButtonProps): ReactNode {
    const element = useRef<HTMLButtonElement>(null);
    useImperativeHandle(ref, () => ({
        focus() {
            element.current?.focus();
        },
        blur() {
            element.current?.blur();
        },
    }));
    useImperativeHandle(anchor, () => ({
        getBoundingBox() {
            return getBoundingBox(element.current!);
        },
    }));
    if (children != null || label != null) {
        throw new TypeError();
    }
    return (<button {...props} ref={el => element.current = el} class={clsx(styles.root, disabled && styles.disabled)} disabled={disabled} tabIndex={tabIndex} title={title}>
      {icon}
    </button>);
}
