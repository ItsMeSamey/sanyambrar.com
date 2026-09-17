import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";
import styles from "./LinkButton.module.css";
import { type ClassName, type FocusProps, type KeyboardProps, type MouseProps, } from "../types.ts";
type LinkButtonProps = {
    readonly children?: JSX.Element;
    readonly className?: ClassName;
    readonly label?: JSX.Element;
    readonly ariaLabel?: string;
    readonly title?: string;
} & FocusProps & MouseProps & KeyboardProps;
import { omit } from 'solid-js';
export function LinkButton(allProps: LinkButtonProps): JSX.Element {
    const local = allProps, props = omit(allProps, "children", "className", "disabled", "label", "ariaLabel", "tabIndex", "title", "onClick");
    return (<a {...props} href="#" class={clsx(styles.root, local.disabled && styles.disabled, local.className)} tabindex={local.tabIndex} aria-label={local.ariaLabel} title={local.title} onClick={(event) => {
            event.preventDefault();
            local.onClick?.(event);
        }}>
      {local.label || local.children}
    </a>);
}
