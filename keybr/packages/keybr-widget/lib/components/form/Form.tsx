import { clsx } from "clsx";
import { type ReactNode } from "react";
import * as styles from "./Form.module.less";
import {
  type FieldSetProps,
  type FormProps,
  type LegendProps,
} from "./Form.types.ts";

export function FieldSet(props: FieldSetProps): ReactNode {
  const { className, id, disabled, legend, title, children } = props;
  return (
    <fieldset
      id={id} //
      className={clsx(styles.fieldSet, className)}
      disabled={disabled}
      title={title}
    >
      {legend && <Legend>{legend}</Legend>}
      {children}
    </fieldset>
  );
}

export function Legend(props: LegendProps): ReactNode {
  const { className, id, children, title } = props;
  return (
    <legend
      id={id} //
      className={clsx(styles.legend, className)}
      title={title}
    >
      {children}
    </legend>
  );
}
