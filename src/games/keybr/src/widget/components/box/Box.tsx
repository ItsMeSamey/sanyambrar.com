import type { JSX } from "@solidjs/web";
import "./Box.module.css";
import { clsx } from "clsx";

import { Dynamic } from '@solidjs/web';
import { type BoxProps } from "./Box.types.ts";
import { getBoxClassNames } from "./classNames.ts";

export function Box(props: BoxProps): JSX.Element {
    return (<Dynamic component={(props.as ?? "div")} id={props.id} class={clsx(getBoxClassNames(props), props.className)} title={props.title}>
      {props.children}
    </Dynamic>);
}
