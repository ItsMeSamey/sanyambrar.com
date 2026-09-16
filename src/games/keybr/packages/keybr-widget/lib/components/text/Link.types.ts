import type { JSX } from "@solidjs/web";
import type { ValidComponent } from "@solidjs/web";
import { type ClassName, type MouseProps } from "../types.ts";
export type LinkProps = {
    readonly as?: ValidComponent;
    readonly className?: ClassName;
    readonly id?: string;
    readonly href?: string;
    readonly target?: string;
    readonly download?: string;
    readonly title?: string;
    readonly children?: JSX.Element;
} & MouseProps;
