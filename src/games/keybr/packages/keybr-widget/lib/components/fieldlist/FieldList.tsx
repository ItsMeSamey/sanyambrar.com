import { type ReactNode } from "@keybr/solid-compat/react";
import { Dynamic } from "solid-js/web";
import { sizeClassName, styleSizeFill } from "../../styles/size.ts";
import * as styles from "./FieldList.module.css";
import { type FieldListProps, type FieldProps } from "./FieldList.types.ts";

export function FieldList(props: FieldListProps): ReactNode {
    const { as: component = "div", title, children } = props;
    return (<Dynamic component={component as any} class={styles.root} title={title}>
      {children}
    </Dynamic>);
}
export function Field(props: FieldProps): ReactNode {
    const { as: component = "span", size, title, children } = props;
    return (<Dynamic component={component as any} class={sizeClassName(size)} title={title}>
      {children}
    </Dynamic>);
}
Field.Filler = function Filler(): ReactNode {
    return <span class={styleSizeFill}/>;
};
