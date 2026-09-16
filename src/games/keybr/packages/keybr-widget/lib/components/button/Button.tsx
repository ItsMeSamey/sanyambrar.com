import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";
import { sizeClassName } from "../../styles/index.ts";
import * as iconStyles from "../icon/Icon.module.css";
import * as styles from "./Button.module.css";
import { type ButtonProps } from "./Button.types.ts";
import { omit } from 'solid-js';
export function Button(solidAllProps: ButtonProps): JSX.Element {
    const solidLocal = solidAllProps, props = omit(solidAllProps, "children", "disabled", "icon", "label", "size", "tabIndex", "title");
    return (<button {...props} class={clsx(styles.root, iconStyles.altIcon, solidLocal.disabled && styles.disabled, sizeClassName(solidLocal.size))} disabled={solidLocal.disabled} tabindex={solidLocal.tabIndex} title={solidLocal.title}>
      {solidLocal.icon} {solidLocal.label || solidLocal.children}
    </button>);
}
