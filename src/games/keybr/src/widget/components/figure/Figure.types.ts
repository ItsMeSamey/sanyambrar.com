import type { JSX } from "@solidjs/web";
import type { ValidComponent } from "@solidjs/web";
import { type ClassName } from "../types.ts";
export type FigureProps = {
    readonly as?: ValidComponent;
    readonly className?: ClassName;
    readonly id?: string;
    readonly title?: string;
    readonly children?: JSX.Element;
    readonly caption?: JSX.Element;
    readonly description?: JSX.Element;
    readonly legend?: JSX.Element;
};
export type FigureCaptionProps = {
    readonly as?: ValidComponent;
    readonly className?: ClassName;
    readonly id?: string;
    readonly title?: string;
    readonly children?: JSX.Element;
};
export type FigureDescriptionProps = {
    readonly as?: ValidComponent;
    readonly className?: ClassName;
    readonly id?: string;
    readonly title?: string;
    readonly children?: JSX.Element;
};
export type FigureLegendProps = {
    readonly as?: ValidComponent;
    readonly className?: ClassName;
    readonly id?: string;
    readonly title?: string;
    readonly children?: JSX.Element;
};
