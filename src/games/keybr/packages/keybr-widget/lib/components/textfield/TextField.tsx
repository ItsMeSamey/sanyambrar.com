import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode, type RefObject, useEffect, useImperativeHandle, useRef, } from "@keybr/solid-compat/react";
import { sizeClassName } from "../../styles/index.ts";
import * as styles from "./TextField.module.css";
import { type TextFieldProps } from "./TextField.types.ts";
export function TextField({ disabled, error, maxLength, name, placeholder, readOnly, ref, rows, size, tabIndex, title, type = "text", value, onChange, onInput, ...props }: TextFieldProps): ReactNode {
    const element = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
    useImperativeHandle(ref, () => ({
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
        element.current?.setCustomValidity(error ?? "");
    }, () => [error]);
    if (type === "textarea") {
        return (<textarea {...props} ref={el => element.current = el} class={clsx(styles.root, disabled && styles.disabled, sizeClassName(size))} disabled={disabled} maxLength={maxLength} name={name} placeholder={placeholder} readOnly={readOnly} rows={rows} tabIndex={tabIndex} title={title} value={value} onChange={(event) => {
                onChange?.(event.target.value);
            }} onInput={(event) => {
                onInput?.(event as InputEvent);
            }}/>);
    }
    else {
        return (<input {...props} ref={el => element.current = el} class={clsx(styles.root, disabled && styles.disabled, sizeClassName(size))} disabled={disabled} maxLength={maxLength} name={name} placeholder={placeholder} readOnly={readOnly} tabIndex={tabIndex} title={title} type={type} value={value} onChange={(event) => {
                onChange?.(event.target.value);
            }} onInput={(event) => {
                onInput?.(event as InputEvent);
            }}/>);
    }
}
