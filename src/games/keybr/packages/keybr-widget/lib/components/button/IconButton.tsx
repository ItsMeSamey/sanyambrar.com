import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";
import * as styles from "./IconButton.module.css";
import { type IconButtonProps } from "./IconButton.types.ts";
import { omit } from 'solid-js';
export function IconButton(solidAllProps: IconButtonProps): JSX.Element {
    const solidLocal = solidAllProps, props = omit(solidAllProps, "children", "disabled", "icon", "label", "tabIndex", "title");
    return (<button {...props} class={clsx(styles.root, solidLocal.disabled && styles.disabled)} disabled={solidLocal.disabled} tabindex={solidLocal.tabIndex} title={solidLocal.title}>
      {solidLocal.icon}
    </button>);
}
