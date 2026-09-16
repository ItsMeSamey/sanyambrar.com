import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";

import * as styles from "./NameValue.module.css";
import { type NameProps, type NameValueProps, type ValueProps, } from "./NameValue.types.ts";
export function NameValue(solidProps: NameValueProps): JSX.Element {
    return (<span class={clsx(styles.nameValue, solidProps.className)} title={solidProps.title}>
      {asName(solidProps.name)}
      {asValue(solidProps.value)}
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
export function Name(solidProps: NameProps): JSX.Element {
    return (<span class={clsx(styles.name, solidProps.className)} title={solidProps.title}>
      {solidProps.children ?? (solidProps.name != null ? solidProps.name + ":" : null)}
    </span>);
}
export function asValue(v: JSX.Element): JSX.Element {
    return typeof v === "string" || typeof v === "number"
        ? <Value value={v}/>
        : v;
}
export function Value(solidProps: ValueProps): JSX.Element {
    return (<span class={clsx(styles.value, solidProps.delta != null && solidProps.delta > 0 && styles.valueMore, solidProps.delta != null && solidProps.delta < 0 && styles.valueLess, solidProps.className)} title={solidProps.title}>
      {solidProps.children ?? solidProps.value}
    </span>);
}
