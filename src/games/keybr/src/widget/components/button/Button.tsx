import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";
import { sizeClassName } from "../../styles/index.ts";
import * as iconStyles from "../icon/Icon.module.css";
import * as styles from "./Button.module.css";
import { type ButtonProps } from "./Button.types.ts";
import { omit } from 'solid-js';
export function Button(allProps: ButtonProps): JSX.Element {
    const local = allProps, props = omit(allProps, "children", "disabled", "icon", "label", "size", "tabIndex", "title");
    return (<button {...props} class={clsx(styles.root, iconStyles.altIcon, local.disabled && styles.disabled, sizeClassName(local.size))} disabled={local.disabled} tabindex={local.tabIndex} title={local.title}>
      {local.icon} {local.label || local.children}
    </button>);
}
