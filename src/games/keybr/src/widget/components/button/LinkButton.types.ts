import type { JSX } from "@solidjs/web";
import { type ClassName, type FocusProps, type KeyboardProps, type MouseProps, } from "../types.ts";
export type LinkButtonProps = {
    readonly children?: JSX.Element;
    readonly className?: ClassName;
    readonly label?: JSX.Element;
    readonly ariaLabel?: string;
    readonly title?: string;
} & FocusProps & MouseProps & KeyboardProps;
