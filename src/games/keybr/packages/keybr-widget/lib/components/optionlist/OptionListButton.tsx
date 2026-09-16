import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";
import { sizeClassName, type SizeName } from "../../styles/index.ts";
import { type FocusProps, type KeyboardProps, type MouseProps, } from "../types.ts";
import { type OptionListOption } from "./OptionList.types.ts";
import * as styles from "./OptionListButton.module.css";
import { omit } from 'solid-js';
export function OptionListButton(solidAllProps: {
    readonly children: JSX.Element;
    readonly size?: SizeName;
    readonly focused: boolean;
    readonly open: boolean;
    readonly option: OptionListOption;
    readonly title?: string;
} & FocusProps & MouseProps & KeyboardProps): JSX.Element {
    const solidLocal = solidAllProps, props = omit(solidAllProps, "children", "size", "disabled", "focused", "open", "option", "tabIndex", "title", "onClick");
    return (<span {...props} class={clsx(styles.root, solidLocal.focused && styles.focused, solidLocal.disabled && styles.disabled, sizeClassName(solidLocal.size))} data-cursor-round="" tabindex={solidLocal.disabled ? undefined : (solidLocal.tabIndex ?? 0)} title={solidLocal.title}>
      <span class={styles.placeholder} onClick={solidLocal.onClick}>
        <span class={styles.placeholderName}>{solidLocal.option.name}</span>
        <span class={styles.placeholderArrow}>
          {solidLocal.open ? "\u25BC" : "\u25BA"}
        </span>
      </span>
      {solidLocal.children}
    </span>);
}
