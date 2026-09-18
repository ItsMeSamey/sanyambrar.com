import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";
import { sizeClassName, type SizeName } from "../../styles/size.ts";
import iconStyles from "../icon/Icon.module.css";
import styles from "./Button.module.css";
import { type FocusProps, type KeyboardProps, type MouseProps } from "../types.ts";
type ButtonProps = {
    readonly autoFocus?: boolean;
    readonly children?: JSX.Element;
    readonly icon?: JSX.Element;
    readonly label?: JSX.Element;
    readonly size?: SizeName;
    readonly title?: string;
} & FocusProps & MouseProps & KeyboardProps;
import { omit } from 'solid-js';
export function Button(allProps: ButtonProps): JSX.Element {
    const local = allProps, props = omit(allProps, "children", "disabled", "icon", "label", "size", "tabIndex", "title");
    return (<button {...props} class={clsx(styles.root, iconStyles.altIcon, local.disabled && styles.disabled, sizeClassName(local.size))} disabled={local.disabled} tabindex={local.tabIndex} title={local.title}>
      {local.icon} {local.label || local.children}
    </button>);
}
