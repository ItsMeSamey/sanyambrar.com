import type { JSX } from "@solidjs/web";
import { Dynamic } from '@solidjs/web';
import { sizeClassName, styleSizeFill } from "../../styles/size.ts";
import styles from "./FieldList.module.css";
import { type FieldListProps, type FieldProps } from "./FieldList.types.ts";

export function FieldList(props: FieldListProps): JSX.Element {
    return (<Dynamic component={(props.as ?? "div")} class={styles.root} title={props.title}>
      {props.children}
    </Dynamic>);
}
export function Field(props: FieldProps): JSX.Element {
    return (<Dynamic component={(props.as ?? "span")} class={sizeClassName(props.size)} title={props.title}>
      {props.children}
    </Dynamic>);
}
Field.Filler = function Filler(): JSX.Element {
    return <span class={styleSizeFill}/>;
};
