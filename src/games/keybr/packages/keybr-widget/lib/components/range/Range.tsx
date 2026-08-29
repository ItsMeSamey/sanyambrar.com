import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode, useImperativeHandle, useRef } from "@keybr/solid-compat/react";
import { sizeClassName } from "../../styles/index.ts";
import * as styles from "./Range.module.css";
import { type RangeProps } from "./Range.types.ts";
import { splitProps } from "solid-js";
export function Range(solidAllProps: RangeProps): ReactNode {
    const [solidLocal, props] = splitProps(solidAllProps, ["disabled", "max", "min", "name", "ref", "size", "step", "tabIndex", "title", "value", "onChange"]);
    const element = useRef<HTMLInputElement>(null);
    useImperativeHandle(solidLocal.ref, () => ({
        focus() {
            element.current?.focus();
        },
        blur() {
            element.current?.blur();
        },
    }));
    return (<input {...props} ref={el => element.current = el} class={clsx(styles.root, solidLocal.disabled && styles.disabled, sizeClassName(solidLocal.size))} disabled={solidLocal.disabled} max={solidLocal.max} min={solidLocal.min} name={solidLocal.name} step={solidLocal.step} tabIndex={solidLocal.tabIndex} title={solidLocal.title} type="range" value={solidLocal.value} onChange={(event) => {
            solidLocal.onChange?.(Number((event.target as HTMLInputElement).value));
        }}/>);
}
