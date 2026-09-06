import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode, useImperativeHandle, useRef } from "@keybr/solid-compat/react";
import { getBoundingBox } from "../../utils/index.ts";
import * as styles from "./IconButton.module.css";
import { type IconButtonProps } from "./IconButton.types.ts";
import { omit } from 'solid-js';
export function IconButton(solidAllProps: IconButtonProps): ReactNode {
    const solidLocal = solidAllProps, props = omit(solidAllProps, "anchor", "children", "disabled", "icon", "label", "ref", "tabIndex", "title");
    const element = useRef<HTMLButtonElement>(null);
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
    if (solidLocal.children != null || solidLocal.label != null) {
        throw new TypeError();
    }
    return (<button {...props} ref={el => element.current = el} class={clsx(styles.root, solidLocal.disabled && styles.disabled)} disabled={solidLocal.disabled} tabindex={solidLocal.tabIndex} title={solidLocal.title}>
      {solidLocal.icon}
    </button>);
}
