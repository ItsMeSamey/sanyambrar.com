import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode, useEffect, useImperativeHandle, useRef, } from "@keybr/solid-compat/react";
import { sizeClassName } from "../../styles/index.ts";
import * as styles from "./TextField.module.css";
import { type TextFieldProps } from "./TextField.types.ts";
import { omit, merge } from 'solid-js';
export function TextField(solidAllProps: TextFieldProps): ReactNode {
    const solidMergedProps = merge(solidAllProps, { get type() { return solidAllProps.type ?? "text"; } });
    const solidLocal = solidMergedProps, props = omit(solidMergedProps, "disabled", "error", "maxLength", "name", "placeholder", "readOnly", "ref", "rows", "size", "tabIndex", "title", "type", "value", "onChange", "onInput");
    const element = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
    useImperativeHandle(solidLocal.ref, () => ({
        focus() {
            element.current?.focus();
        },
        blur() {
            element.current?.blur();
        },
        select() {
            element.current?.select();
        },
    }));
    useEffect(() => {
        element.current?.setCustomValidity(solidLocal.error ?? "");
    }, () => [solidLocal.error]);
    if (solidLocal.type === "textarea") {
        return (<textarea {...props} ref={el => element.current = el} class={clsx(styles.root, solidLocal.disabled && styles.disabled, sizeClassName(solidLocal.size))} disabled={solidLocal.disabled} maxlength={solidLocal.maxLength} name={solidLocal.name} placeholder={solidLocal.placeholder} readonly={solidLocal.readOnly} rows={solidLocal.rows} tabindex={solidLocal.tabIndex} title={solidLocal.title} value={solidLocal.value} onChange={(event) => {
                solidLocal.onChange?.(event.target.value);
            }} onInput={(event) => {
                solidLocal.onInput?.(event as InputEvent);
            }}/>);
    }
    else {
        return (<input {...props} ref={el => element.current = el} class={clsx(styles.root, solidLocal.disabled && styles.disabled, sizeClassName(solidLocal.size))} disabled={solidLocal.disabled} maxlength={solidLocal.maxLength} name={solidLocal.name} placeholder={solidLocal.placeholder} readonly={solidLocal.readOnly} tabindex={solidLocal.tabIndex} title={solidLocal.title} type={solidLocal.type} value={solidLocal.value} onChange={(event) => {
                solidLocal.onChange?.(event.target.value);
            }} onInput={(event) => {
                solidLocal.onInput?.(event as InputEvent);
            }}/>);
    }
}
