import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import { Dynamic } from "solid-js/web";
import * as styles from "./Figure.module.css";
import { type FigureCaptionProps, type FigureDescriptionProps, type FigureLegendProps, type FigureProps, } from "./Figure.types.ts";

export function Figure(props: FigureProps): ReactNode {
    return (<Dynamic component={(props.as ?? "figure") as any} id={props.id} title={props.title} class={clsx(styles.root, props.className)}>
      {props.caption && <Figure.Caption>{props.caption}</Figure.Caption>}
      {props.description && <Figure.Description>{props.description}</Figure.Description>}
      {props.children}
      {props.legend && <Figure.Legend>{props.legend}</Figure.Legend>}
    </Dynamic>);
}
function FigureCaption(props: FigureCaptionProps): ReactNode {
    return (<Dynamic component={(props.as ?? "figcaption") as any} id={props.id} title={props.title} class={clsx(styles.caption, props.className)}>
      {props.children}
    </Dynamic>);
}
function FigureDescription(props: FigureDescriptionProps): ReactNode {
    return (<Dynamic component={(props.as ?? "p") as any} id={props.id} title={props.title} class={clsx(styles.description, props.className)}>
      {props.children}
    </Dynamic>);
}
function FigureLegend(props: FigureLegendProps): ReactNode {
    return (<Dynamic component={(props.as ?? "p") as any} id={props.id} title={props.title} class={clsx(styles.legend, props.className)}>
      {props.children}
    </Dynamic>);
}
Figure.Caption = FigureCaption;
Figure.Description = FigureDescription;
Figure.Legend = FigureLegend;
