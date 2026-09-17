import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";

import { Dynamic } from '@solidjs/web';
import styles from "./Figure.module.css";
import { type FigureCaptionProps, type FigureDescriptionProps, type FigureLegendProps, type FigureProps, } from "./Figure.types.ts";

export function Figure(props: FigureProps): JSX.Element {
    return (<Dynamic component={(props.as ?? "figure")} id={props.id} title={props.title} class={clsx(styles.root, props.className)}>
      {props.caption && <Figure.Caption>{props.caption}</Figure.Caption>}
      {props.description && <Figure.Description>{props.description}</Figure.Description>}
      {props.children}
      {props.legend && <Figure.Legend>{props.legend}</Figure.Legend>}
    </Dynamic>);
}
function FigureCaption(props: FigureCaptionProps): JSX.Element {
    return (<Dynamic component={(props.as ?? "figcaption")} id={props.id} title={props.title} class={clsx(styles.caption, props.className)}>
      {props.children}
    </Dynamic>);
}
function FigureDescription(props: FigureDescriptionProps): JSX.Element {
    return (<Dynamic component={(props.as ?? "p")} id={props.id} title={props.title} class={clsx(styles.description, props.className)}>
      {props.children}
    </Dynamic>);
}
function FigureLegend(props: FigureLegendProps): JSX.Element {
    return (<Dynamic component={(props.as ?? "p")} id={props.id} title={props.title} class={clsx(styles.legend, props.className)}>
      {props.children}
    </Dynamic>);
}
Figure.Caption = FigureCaption;
Figure.Description = FigureDescription;
Figure.Legend = FigureLegend;
