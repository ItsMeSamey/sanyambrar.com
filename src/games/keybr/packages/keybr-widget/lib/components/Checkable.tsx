import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode, type RefObject, useImperativeHandle, useRef } from "@keybr/solid-compat/react";
import { Dynamic } from "solid-js/web";
import * as styles from "./Checkable.module.css";
import { type Focusable, type FocusProps, type KeyboardProps, type MouseProps } from "./types.ts";
import { splitProps } from "solid-js";
export type CheckableInputProps = {
    readonly checked?: boolean;
    readonly children?: ReactNode;
    readonly label?: ReactNode;
    readonly name?: string;
    readonly ref?: RefObject<Focusable | null>;
    readonly title?: string;
    readonly value?: string;
    readonly onChange?: (checked: boolean) => void;
} & FocusProps & MouseProps & KeyboardProps;
export type CheckableProps = CheckableInputProps & {
    readonly iconOff: string | ((props: any) => any);
    readonly iconOn: string | ((props: any) => any);
    readonly type: "checkbox" | "radio";
    readonly onSelect?: (value?: string) => void;
};
export function Checkable(solidAllProps: CheckableProps): ReactNode {
    const [solidLocal, props] = splitProps(solidAllProps, ["checked", "children", "disabled", "iconOff", "iconOn", "label", "name", "ref", "tabIndex", "title", "type", "value", "onBlur", "onChange", "onFocus", "onSelect"]);
    const element = useRef<HTMLInputElement>(null);
    useImperativeHandle(solidLocal.ref, () => ({
        focus: () => element.current?.focus(),
        blur: () => element.current?.blur(),
    }));
    return (<label {...props} class={clsx(styles.root, solidLocal.disabled && styles.disabled)} title={solidLocal.title}>
      <input ref={el => element.current = el} checked={solidLocal.checked} disabled={solidLocal.disabled} name={solidLocal.name} tabIndex={solidLocal.tabIndex} type={solidLocal.type} value={solidLocal.value} onBlur={solidLocal.onBlur} onChange={(event) => {
            const { checked } = event.target as HTMLInputElement;
            solidLocal.onChange?.(checked);
            if (checked)
                solidLocal.onSelect?.(solidLocal.value);
        }} onFocus={solidLocal.onFocus}/>
      {typeof (solidLocal.checked ? solidLocal.iconOn : solidLocal.iconOff) === "function" ? (
        <Dynamic component={(solidLocal.checked ? solidLocal.iconOn : solidLocal.iconOff) as any} class={styles.icon} />
      ) : (
        <svg class={styles.icon} viewBox="0 0 24 24"><path d={(solidLocal.checked ? solidLocal.iconOn : solidLocal.iconOff) as string}/></svg>
      )}
      <span class={styles.label}>{solidLocal.label || solidLocal.children}</span>
    </label>);
}
