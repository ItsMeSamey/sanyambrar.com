import { clsx } from "@keybr/solid-compat/clsx";
import { isValidElement, type ReactElement, type ReactNode } from "@keybr/solid-compat/react";
import * as styles from "./NameValue.module.css";
import { type NameProps, type NameValueProps, type ValueProps, } from "./NameValue.types.ts";
export function NameValue(solidProps: NameValueProps): ReactNode {
    return (<span class={clsx(styles.nameValue, solidProps.className)} title={solidProps.title}>
      {asName(solidProps.name)}
      {asValue(solidProps.value)}
    </span>);
}
export function asName(v: any): ReactElement<NameProps> {
    if (isValidElement<NameProps>(v) && v.type === Name) {
        return v;
    }
    else {
        return <Name name={v}/>;
    }
}
export function Name(solidProps: NameProps): ReactNode {
    return (<span class={clsx(styles.name, solidProps.className)} title={solidProps.title}>
      {solidProps.children || solidProps.name + ":"}
    </span>);
}
export function asValue(v: any): ReactElement<ValueProps> {
    if (isValidElement<ValueProps>(v) && v.type === Value) {
        return v;
    }
    else {
        return <Value value={v}/>;
    }
}
export function Value(solidProps: ValueProps): ReactNode {
    return (<span class={clsx(styles.value, solidProps.delta != null && solidProps.delta > 0 && styles.valueMore, solidProps.delta != null && solidProps.delta < 0 && styles.valueLess, solidProps.className)} title={solidProps.title}>
      {solidProps.children || solidProps.value}
    </span>);
}
