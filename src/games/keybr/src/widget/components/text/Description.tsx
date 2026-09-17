import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";

import { Dynamic } from '@solidjs/web';
import styles from "./Description.module.css";
import { type ElementProps } from "../types.ts";
type DescriptionProps = ElementProps;
export function Description(props: DescriptionProps): JSX.Element {
    return (<Dynamic component={(props.as ?? "p")} id={props.id} class={clsx(styles.root, props.className)} title={props.title}>
      {props.children}
    </Dynamic>);
}
