import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";

import { Dynamic } from '@solidjs/web';
import { alignClassName } from "../../styles/text.ts";
import { type AlignName } from "../../styles/text.ts";
import { type ElementProps } from "../types.ts";
type ParaProps = ElementProps & { readonly align?: AlignName };
export function Para(props: ParaProps): JSX.Element {
    return (<Dynamic component={(props.as ?? "p")} id={props.id} title={props.title} class={clsx(alignClassName(props.align), props.className)}>
      {props.children}
    </Dynamic>);
}
