import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";

import styles from "./Form.module.css";
import { type FieldSetProps, type LegendProps, } from "./Form.types.ts";
export function FieldSet(props: FieldSetProps): JSX.Element {
    return (<fieldset id={props.id} //
     class={clsx(styles.fieldSet, props.className)} disabled={props.disabled} title={props.title}>
      {props.legend && <Legend>{props.legend}</Legend>}
      {props.children}
    </fieldset>);
}
export function Legend(props: LegendProps): JSX.Element {
    return (<legend id={props.id} //
     class={clsx(styles.legend, props.className)} title={props.title}>
      {props.children}
    </legend>);
}
