import { type ReactNode } from "@keybr/solid-compat/react";
import { Dynamic } from "solid-js/web";
import { sizeClassName, styleSizeFill } from "../../styles/size.ts";
import * as styles from "./FieldList.module.css";
import { type FieldListProps, type FieldProps } from "./FieldList.types.ts";

export function FieldList(props: FieldListProps): ReactNode {
    return (<Dynamic component={(props.as ?? "div") as any} class={styles.root} title={props.title}>
      {props.children}
    </Dynamic>);
}
export function Field(props: FieldProps): ReactNode {
    return (<Dynamic component={(props.as ?? "span") as any} class={sizeClassName(props.size)} title={props.title}>
      {props.children}
    </Dynamic>);
}
Field.Filler = function Filler(): ReactNode {
    return <span class={styleSizeFill}/>;
};
