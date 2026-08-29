import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode, useImperativeHandle, useRef } from "@keybr/solid-compat/react";
import { getBoundingBox } from "../../utils/index.ts";
import * as styles from "./LinkButton.module.css";
import { type LinkButtonProps } from "./LinkButton.types.ts";
import { splitProps } from "solid-js";
export function LinkButton(solidAllProps: LinkButtonProps): ReactNode {
    const [solidLocal, props] = splitProps(solidAllProps, ["anchor", "children", "className", "disabled", "label", "ref", "tabIndex", "title", "onClick"]);
    const element = useRef<HTMLAnchorElement>(null);
    useImperativeHandle(solidLocal.ref, () => ({
        focus() {
            element.current?.focus();
        },
        blur() {
            element.current?.blur();
        },
    }));
    useImperativeHandle(solidLocal.anchor, () => ({
        getBoundingBox() {
            return getBoundingBox(element.current!);
        },
    }));
    return (<a {...props} ref={el => element.current = el} href="#" class={clsx(styles.root, solidLocal.disabled && styles.disabled, solidLocal.className)} tabIndex={solidLocal.tabIndex} title={solidLocal.title} onClick={(event) => {
            event.preventDefault();
            solidLocal.onClick?.(event);
        }}>
      {solidLocal.label || solidLocal.children}
    </a>);
}
