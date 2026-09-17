import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";
import styles from "./LinkButton.module.css";
import { type LinkButtonProps } from "./LinkButton.types.ts";
import { omit } from 'solid-js';
export function LinkButton(allProps: LinkButtonProps): JSX.Element {
    const local = allProps, props = omit(allProps, "children", "className", "disabled", "label", "tabIndex", "title", "onClick");
    return (<a {...props} href="#" class={clsx(styles.root, local.disabled && styles.disabled, local.className)} tabindex={local.tabIndex} title={local.title} onClick={(event) => {
            event.preventDefault();
            local.onClick?.(event);
        }}>
      {local.label || local.children}
    </a>);
}
