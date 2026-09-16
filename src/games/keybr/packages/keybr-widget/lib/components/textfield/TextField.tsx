import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";
import { sizeClassName } from "../../styles/index.ts";
import * as styles from "./TextField.module.css";
import { type TextFieldProps } from "./TextField.types.ts";
import { createEffect, omit, merge } from 'solid-js';
export function TextField(solidAllProps: TextFieldProps): JSX.Element {
    const solidMergedProps = merge(solidAllProps, { get type() { return solidAllProps.type ?? "text"; } });
    const solidLocal = solidMergedProps, props = omit(solidMergedProps, "disabled", "error", "maxLength", "name", "placeholder", "readOnly", "rows", "size", "tabIndex", "title", "type", "value", "onChange", "onInput");
    let element: HTMLTextAreaElement | HTMLInputElement | undefined;
    createEffect(() => solidLocal.error, (error) => element?.setCustomValidity(error ?? ""));
    if (solidLocal.type === "textarea") {
        return (<textarea {...props} ref={el => element = el} class={clsx(styles.root, solidLocal.disabled && styles.disabled, sizeClassName(solidLocal.size))} disabled={solidLocal.disabled} maxlength={solidLocal.maxLength} name={solidLocal.name} placeholder={solidLocal.placeholder} readonly={solidLocal.readOnly} rows={solidLocal.rows} tabindex={solidLocal.tabIndex} title={solidLocal.title} value={solidLocal.value} onChange={(event) => {
                solidLocal.onChange?.(event.target.value);
            }} onInput={(event) => {
                solidLocal.onInput?.(event as InputEvent);
            }}/>);
    }
    else {
        return (<input {...props} ref={el => element = el} class={clsx(styles.root, solidLocal.disabled && styles.disabled, sizeClassName(solidLocal.size))} disabled={solidLocal.disabled} maxlength={solidLocal.maxLength} name={solidLocal.name} placeholder={solidLocal.placeholder} readonly={solidLocal.readOnly} tabindex={solidLocal.tabIndex} title={solidLocal.title} type={solidLocal.type} value={solidLocal.value} onChange={(event) => {
                solidLocal.onChange?.(event.target.value);
            }} onInput={(event) => {
                solidLocal.onInput?.(event as InputEvent);
            }}/>);
    }
}
