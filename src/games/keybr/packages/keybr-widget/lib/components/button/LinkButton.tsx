import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";
import * as styles from "./LinkButton.module.css";
import { type LinkButtonProps } from "./LinkButton.types.ts";
import { omit } from 'solid-js';
export function LinkButton(solidAllProps: LinkButtonProps): JSX.Element {
    const solidLocal = solidAllProps, props = omit(solidAllProps, "children", "className", "disabled", "label", "tabIndex", "title", "onClick");
    return (<a {...props} href="#" class={clsx(styles.root, solidLocal.disabled && styles.disabled, solidLocal.className)} tabindex={solidLocal.tabIndex} title={solidLocal.title} onClick={(event) => {
            event.preventDefault();
            solidLocal.onClick?.(event);
        }}>
      {solidLocal.label || solidLocal.children}
    </a>);
}
