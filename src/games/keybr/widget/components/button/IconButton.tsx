import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";
import styles from "./IconButton.module.css";
import { type FocusProps, type KeyboardProps, type MouseProps, } from "../types.ts";
type IconButtonProps = {
    readonly autoFocus?: boolean;
    readonly children?: JSX.Element;
    readonly icon: JSX.Element;
    readonly label?: JSX.Element;
    readonly title?: string;
    readonly "data-samey-appearance"?: string;
    readonly "aria-expanded"?: "true" | "false";
} & FocusProps & MouseProps & KeyboardProps;
import { omit } from 'solid-js';
export function IconButton(allProps: IconButtonProps): JSX.Element {
    const local = allProps, props = omit(allProps, "children", "disabled", "icon", "label", "tabIndex", "title");
    return (<button {...props} class={clsx(styles.root, local.disabled && styles.disabled)} disabled={local.disabled} tabindex={local.tabIndex} title={local.title}>
      {local.icon}
    </button>);
}
