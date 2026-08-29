import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactElement, type ReactNode } from "@keybr/solid-compat/react";
import * as styles from "./NameValue.module.css";
import { type NameProps, type NameValueProps, type ValueProps, } from "./NameValue.types.ts";
export function NameValue(solidProps: NameValueProps): ReactNode {
    return (<span class={clsx(styles.nameValue, solidProps.className)} title={solidProps.title}>
      {asName(solidProps.name)}
      {asValue(solidProps.value)}
    </span>);
}
export function asName(v: any): ReactElement<NameProps> {
    // Solid JSX is eagerly rendered. A component passed here is already a DOM
    // node, not a React vnode that can be inspected through `.type`. Preserve
    // rendered nodes and only wrap primitive labels.
    return typeof v === "string" || typeof v === "number"
        ? <Name name={String(v)}/>
        : v;
}
export function Name(solidProps: NameProps): ReactNode {
    return (<span class={clsx(styles.name, solidProps.className)} title={solidProps.title}>
      {solidProps.children ?? (solidProps.name != null ? solidProps.name + ":" : null)}
    </span>);
}
export function asValue(v: any): ReactElement<ValueProps> {
    return typeof v === "string" || typeof v === "number"
        ? <Value value={v}/>
        : v;
}
export function Value(solidProps: ValueProps): ReactNode {
    return (<span class={clsx(styles.value, solidProps.delta != null && solidProps.delta > 0 && styles.valueMore, solidProps.delta != null && solidProps.delta < 0 && styles.valueLess, solidProps.className)} title={solidProps.title}>
      {solidProps.children ?? solidProps.value}
    </span>);
}
