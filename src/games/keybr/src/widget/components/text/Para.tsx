import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";

import { Dynamic } from '@solidjs/web';
import { alignClassName } from "../../styles/text.ts";
import { type ParaProps } from "./Para.types.ts";
export function Para(props: ParaProps): JSX.Element {
    return (<Dynamic component={(props.as ?? "p")} id={props.id} title={props.title} class={clsx(alignClassName(props.align), props.className)}>
      {props.children}
    </Dynamic>);
}
