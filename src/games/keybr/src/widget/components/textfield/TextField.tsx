import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";
import { sizeClassName } from "../../styles/size.ts";
import * as styles from "./TextField.module.css";
import { type TextFieldProps } from "./TextField.types.ts";
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
