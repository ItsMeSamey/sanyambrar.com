import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";
import { sizeClassName } from "../../styles/size.ts";
import styles from "./TextField.module.css";
import { type SizeName } from "../../styles/size.ts";
import { type FocusProps, type KeyboardProps, type MouseProps, } from "../types.ts";
type TextFieldType = "text" | "textarea" | "email" | "url" | "password";
type TextFieldProps = {
    readonly error?: string | null;
    readonly maxLength?: number;
    readonly name?: string;
    readonly placeholder?: string;
    readonly readOnly?: boolean;
    readonly rows?: number;
    readonly size?: SizeName;
    readonly title?: string;
    readonly type?: TextFieldType;
    readonly value?: string;
    readonly onChange?: (value: string) => void;
    readonly onInput?: (event: InputEvent) => void;
} & FocusProps & MouseProps & KeyboardProps;
import { createEffect, omit, merge } from 'solid-js';
export function TextField(allProps: TextFieldProps): JSX.Element {
    const mergedProps = merge(allProps, { get type() { return allProps.type ?? "text"; } });
    const local = mergedProps, props = omit(mergedProps, "disabled", "error", "maxLength", "name", "placeholder", "readOnly", "rows", "size", "tabIndex", "title", "type", "value", "onChange", "onInput");
    let element: HTMLTextAreaElement | HTMLInputElement | undefined;
    createEffect(() => local.error, (error) => element?.setCustomValidity(error ?? ""));
    if (local.type === "textarea") {
        return (<textarea {...props} ref={el => element = el} class={clsx(styles.root, local.disabled && styles.disabled, sizeClassName(local.size))} disabled={local.disabled} maxlength={local.maxLength} name={local.name} placeholder={local.placeholder} readonly={local.readOnly} rows={local.rows} tabindex={local.tabIndex} title={local.title} value={local.value} onChange={(event) => {
                local.onChange?.(event.target.value);
            }} onInput={(event) => {
                local.onInput?.(event as InputEvent);
            }}/>);
    }
    else {
        return (<input {...props} ref={el => element = el} class={clsx(styles.root, local.disabled && styles.disabled, sizeClassName(local.size))} disabled={local.disabled} maxlength={local.maxLength} name={local.name} placeholder={local.placeholder} readonly={local.readOnly} tabindex={local.tabIndex} title={local.title} type={local.type} value={local.value} onChange={(event) => {
                local.onChange?.(event.target.value);
            }} onInput={(event) => {
                local.onInput?.(event as InputEvent);
            }}/>);
    }
}
