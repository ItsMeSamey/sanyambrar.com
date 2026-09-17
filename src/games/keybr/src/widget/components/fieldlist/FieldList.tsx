import type { JSX } from "@solidjs/web";
import { Dynamic } from '@solidjs/web';
import { sizeClassName, styleSizeFill } from "../../styles/size.ts";
import styles from "./FieldList.module.css";
import type { ValidComponent } from "@solidjs/web";
import { type SizeName } from "../../styles/size.ts";
type FieldListProps = {
    readonly as?: ValidComponent;
    readonly children?: JSX.Element;
    readonly title?: string;
};
type FieldProps = {
    readonly as?: ValidComponent;
    readonly children?: JSX.Element;
    readonly size?: SizeName;
    readonly title?: string;
};

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
