import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode, useImperativeHandle, useRef } from "@keybr/solid-compat/react";
import { getBoundingBox } from "../../utils/index.ts";
import * as styles from "./LinkButton.module.css";
import { type LinkButtonProps } from "./LinkButton.types.ts";
export function LinkButton({ anchor, children, className, disabled, label, ref, tabIndex, title, onClick, ...props }: LinkButtonProps): ReactNode {
    const element = useRef<HTMLAnchorElement>(null);
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
    return (<a {...props} ref={el => element.current = el} href="#" class={clsx(styles.root, disabled && styles.disabled, className)} tabIndex={tabIndex} title={title} onClick={(event) => {
            event.preventDefault();
            onClick?.(event);
        }}>
      {label || children}
    </a>);
}
