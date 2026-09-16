import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";
import { sizeClassName, type SizeName } from "../../styles/index.ts";
import { type FocusProps, type KeyboardProps, type MouseProps, } from "../types.ts";
import { type OptionListOption } from "./OptionList.types.ts";
import * as styles from "./OptionListButton.module.css";
import { omit } from 'solid-js';
export function OptionListButton(allProps: {
    readonly children: JSX.Element;
    readonly size?: SizeName;
    readonly focused: boolean;
    readonly open: boolean;
    readonly option: OptionListOption;
    readonly title?: string;
} & FocusProps & MouseProps & KeyboardProps): JSX.Element {
    const local = allProps, props = omit(allProps, "children", "size", "disabled", "focused", "open", "option", "tabIndex", "title", "onClick");
    return (<span {...props} class={clsx(styles.root, local.focused && styles.focused, local.disabled && styles.disabled, sizeClassName(local.size))} data-cursor-round="" tabindex={local.disabled ? undefined : (local.tabIndex ?? 0)} title={local.title}>
      <span class={styles.placeholder} onClick={local.onClick}>
        <span class={styles.placeholderName}>{local.option.name}</span>
        <span class={styles.placeholderArrow}>
          {local.open ? "\u25BC" : "\u25BA"}
        </span>
      </span>
      {local.children}
    </span>);
}
