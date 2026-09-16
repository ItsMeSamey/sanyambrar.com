import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";

import * as styles from "./NameValue.module.css";
import { type NameProps, type NameValueProps, type ValueProps, } from "./NameValue.types.ts";
export function NameValue(props: NameValueProps): JSX.Element {
    return (<span class={clsx(styles.nameValue, props.className)} title={props.title}>
      {asName(props.name)}
      {asValue(props.value)}
    </span>);
}
export function asName(v: JSX.Element): JSX.Element {
    // Solid JSX is eagerly rendered. A component passed here is already a DOM
    // node, not a React vnode that can be inspected through `.type`. Preserve
    // rendered nodes and only wrap primitive labels.
    return typeof v === "string" || typeof v === "number"
        ? <Name name={String(v)}/>
        : v;
}
export function Name(props: NameProps): JSX.Element {
    return (<span class={clsx(styles.name, props.className)} title={props.title}>
      {props.children ?? (props.name != null ? props.name + ":" : null)}
    </span>);
}
export function asValue(v: JSX.Element): JSX.Element {
    return typeof v === "string" || typeof v === "number"
        ? <Value value={v}/>
        : v;
}
export function Value(props: ValueProps): JSX.Element {
    return (<span class={clsx(styles.value, props.delta != null && props.delta > 0 && styles.valueMore, props.delta != null && props.delta < 0 && styles.valueLess, props.className)} title={props.title}>
      {props.children ?? props.value}
    </span>);
}
