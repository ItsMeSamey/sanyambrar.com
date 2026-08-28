import { clsx } from "@keybr/solid-compat/clsx";
import { type ReactNode } from "@keybr/solid-compat/react";
import { Dynamic } from "solid-js/web";
import * as styles from "./Figure.module.css";
import { type FigureCaptionProps, type FigureDescriptionProps, type FigureLegendProps, type FigureProps, } from "./Figure.types.ts";

export function Figure(props: FigureProps): ReactNode {
    const { as: component = "figure", id, title, className, children, caption, description, legend, } = props;
    return (<Dynamic component={component as any} id={id} class={clsx(styles.root, className)} title={title}>
      {caption && <Figure.Caption>{caption}</Figure.Caption>}
      {description && <Figure.Description>{description}</Figure.Description>}
      {children}
      {legend && <Figure.Legend>{legend}</Figure.Legend>}
    </Dynamic>);
}
function FigureCaption(props: FigureCaptionProps): ReactNode {
    const { as: component = "figcaption", id, title, className, children, } = props;
    return (<Dynamic component={component as any} id={id} class={clsx(styles.caption, className)} title={title}>
      {children}
    </Dynamic>);
}
function FigureDescription(props: FigureDescriptionProps): ReactNode {
    const { as: component = "p", id, title, className, children } = props;
    return (<Dynamic component={component as any} id={id} class={clsx(styles.description, className)} title={title}>
      {children}
    </Dynamic>);
}
function FigureLegend(props: FigureLegendProps): ReactNode {
    const { as: component = "p", id, title, className, children } = props;
    return (<Dynamic component={component as any} id={id} class={clsx(styles.legend, className)} title={title}>
      {children}
    </Dynamic>);
}
Figure.Caption = FigureCaption;
Figure.Description = FigureDescription;
Figure.Legend = FigureLegend;
