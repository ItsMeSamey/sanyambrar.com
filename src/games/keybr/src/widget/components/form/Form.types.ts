import type { JSX } from "@solidjs/web";
import { type ClassName } from "../types.ts";
export type FormProps = {
    readonly className?: ClassName;
    readonly id?: string;
    readonly title?: string;
    readonly children: JSX.Element;
};
export type FieldSetProps = {
    readonly className?: ClassName;
    readonly id?: string;
    readonly disabled?: boolean;
    readonly legend?: JSX.Element;
    readonly title?: string;
    readonly children: JSX.Element;
};
export type LegendProps = {
    readonly className?: ClassName;
    readonly id?: string;
    readonly title?: string;
    readonly children: JSX.Element;
};
