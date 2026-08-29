import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode, useImperativeHandle, useRef } from "@keybr/solid-compat/react";
import { sizeClassName } from "../../styles/index.ts";
import { getBoundingBox } from "../../utils/index.ts";
import * as iconStyles from "../icon/Icon.module.css";
import * as styles from "./Button.module.css";
import { type ButtonProps } from "./Button.types.ts";
import { splitProps } from "solid-js";
export function Button(solidAllProps: ButtonProps): ReactNode {
    const [solidLocal, props] = splitProps(solidAllProps, ["anchor", "children", "disabled", "icon", "label", "ref", "size", "tabIndex", "title"]);
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
    return (<button {...props} ref={el => element.current = el} class={clsx(styles.root, iconStyles.altIcon, solidLocal.disabled && styles.disabled, sizeClassName(solidLocal.size))} disabled={solidLocal.disabled} tabIndex={solidLocal.tabIndex} title={solidLocal.title}>
      {solidLocal.icon} {solidLocal.label || solidLocal.children}
    </button>);
}
