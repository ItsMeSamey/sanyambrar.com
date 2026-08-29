import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode, type RefObject, useEffect, useImperativeHandle, useRef, } from "@keybr/solid-compat/react";
import { sizeClassName } from "../../styles/index.ts";
import * as styles from "./TextField.module.css";
import { type TextFieldProps } from "./TextField.types.ts";
import { splitProps, mergeProps } from "solid-js";
export function TextField(solidAllProps: TextFieldProps): ReactNode {
    const solidMergedProps = mergeProps({ type: "text" }, solidAllProps);
    const [solidLocal, props] = splitProps(solidMergedProps, ["disabled", "error", "maxLength", "name", "placeholder", "readOnly", "ref", "rows", "size", "tabIndex", "title", "type", "value", "onChange", "onInput"]);
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
        return (<textarea {...props} ref={el => element.current = el} class={clsx(styles.root, solidLocal.disabled && styles.disabled, sizeClassName(solidLocal.size))} disabled={solidLocal.disabled} maxLength={solidLocal.maxLength} name={solidLocal.name} placeholder={solidLocal.placeholder} readOnly={solidLocal.readOnly} rows={solidLocal.rows} tabIndex={solidLocal.tabIndex} title={solidLocal.title} value={solidLocal.value} onChange={(event) => {
                solidLocal.onChange?.(event.target.value);
            }} onInput={(event) => {
                solidLocal.onInput?.(event as InputEvent);
            }}/>);
    }
    else {
        return (<input {...props} ref={el => element.current = el} class={clsx(styles.root, solidLocal.disabled && styles.disabled, sizeClassName(solidLocal.size))} disabled={solidLocal.disabled} maxLength={solidLocal.maxLength} name={solidLocal.name} placeholder={solidLocal.placeholder} readOnly={solidLocal.readOnly} tabIndex={solidLocal.tabIndex} title={solidLocal.title} type={solidLocal.type} value={solidLocal.value} onChange={(event) => {
                solidLocal.onChange?.(event.target.value);
            }} onInput={(event) => {
                solidLocal.onInput?.(event as InputEvent);
            }}/>);
    }
}
