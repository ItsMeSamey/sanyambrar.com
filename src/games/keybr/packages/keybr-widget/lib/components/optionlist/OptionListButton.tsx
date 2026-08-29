import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode, useRef } from "@keybr/solid-compat/react";
import { sizeClassName, type SizeName } from "../../styles/index.ts";
import { type FocusProps, type KeyboardProps, type MouseProps, } from "../types.ts";
import { type OptionListOption } from "./OptionList.types.ts";
import * as styles from "./OptionListButton.module.css";
import { splitProps } from "solid-js";
export function OptionListButton(solidAllProps: {
    readonly children: ReactNode;
    readonly size?: SizeName;
    readonly focused: boolean;
    readonly open: boolean;
    readonly option: OptionListOption;
    readonly title?: string;
} & FocusProps & MouseProps & KeyboardProps): ReactNode {
    const [solidLocal, props] = splitProps(solidAllProps, ["children", "size", "disabled", "focused", "open", "option", "tabIndex", "title", "onClick"]);
    const element = useRef<HTMLSpanElement>(null);
    return (<span {...props} ref={el => element.current = el} class={clsx(styles.root, solidLocal.focused && styles.focused, solidLocal.disabled && styles.disabled, sizeClassName(solidLocal.size))} data-cursor-round="" tabIndex={solidLocal.disabled ? undefined : (solidLocal.tabIndex ?? 0)} title={solidLocal.title}>
      <span class={styles.placeholder} onClick={solidLocal.onClick}>
        <span class={styles.placeholderName}>{solidLocal.option.name}</span>
        <span class={styles.placeholderArrow}>
          {solidLocal.open ? "\u25BC" : "\u25BA"}
        </span>
      </span>
      {solidLocal.children}
    </span>);
}
