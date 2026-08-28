import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode, useRef } from "@keybr/solid-compat/react";
import { sizeClassName, type SizeName } from "../../styles/index.ts";
import { type FocusProps, type KeyboardProps, type MouseProps, } from "../types.ts";
import { type OptionListOption } from "./OptionList.types.ts";
import * as styles from "./OptionListButton.module.css";
export function OptionListButton({ children, size, disabled, focused, open, option, tabIndex, title, onClick, ...props }: {
    readonly children: ReactNode;
    readonly size?: SizeName;
    readonly focused: boolean;
    readonly open: boolean;
    readonly option: OptionListOption;
    readonly title?: string;
} & FocusProps & MouseProps & KeyboardProps): ReactNode {
    const element = useRef<HTMLSpanElement>(null);
    return (<span {...props} ref={el => element.current = el} class={clsx(styles.root, focused && styles.focused, disabled && styles.disabled, sizeClassName(size))} tabIndex={disabled ? undefined : (tabIndex ?? 0)} title={title}>
      <span class={styles.placeholder} onClick={onClick}>
        <span class={styles.placeholderName}>{option.name}</span>
        <span class={styles.placeholderArrow}>
          {open ? "\u25BC" : "\u25BA"}
        </span>
      </span>
      {children}
    </span>);
}
