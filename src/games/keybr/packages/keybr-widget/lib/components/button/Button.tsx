import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode, useImperativeHandle, useRef } from "@keybr/solid-compat/react";
import { sizeClassName } from "../../styles/index.ts";
import { getBoundingBox } from "../../utils/index.ts";
import * as iconStyles from "../icon/Icon.module.css";
import * as styles from "./Button.module.css";
import { type ButtonProps } from "./Button.types.ts";
export function Button({ anchor, children, disabled, icon, label, ref, size, tabIndex, title, ...props }: ButtonProps): ReactNode {
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
    return (<button {...props} ref={el => element.current = el} class={clsx(styles.root, iconStyles.altIcon, disabled && styles.disabled, sizeClassName(size))} disabled={disabled} tabIndex={tabIndex} title={title}>
      {icon} {label || children}
    </button>);
}
