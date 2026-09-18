import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";

import styles from "./Form.module.css";
import { type ClassName } from "../types.ts";
type FieldSetProps = {
    readonly className?: ClassName;
    readonly id?: string;
    readonly disabled?: boolean;
    readonly legend?: JSX.Element;
    readonly title?: string;
    readonly children: JSX.Element;
};
type LegendProps = {
    readonly className?: ClassName;
    readonly id?: string;
    readonly title?: string;
    readonly children: JSX.Element;
};
export function FieldSet(props: FieldSetProps): JSX.Element {
    return (<fieldset id={props.id} //
     class={clsx(styles.fieldSet, props.className)} disabled={props.disabled} title={props.title}>
      {props.legend && <Legend>{props.legend}</Legend>}
      {props.children}
    </fieldset>);
}
function Legend(props: LegendProps): JSX.Element {
    return (<legend id={props.id} //
     class={clsx(styles.legend, props.className)} title={props.title}>
      {props.children}
    </legend>);
}
