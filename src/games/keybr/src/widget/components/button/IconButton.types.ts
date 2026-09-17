import type { JSX } from "@solidjs/web";
import { type FocusProps, type KeyboardProps, type MouseProps, } from "../types.ts";
export type IconButtonProps = {
    readonly autoFocus?: boolean;
    readonly children?: JSX.Element;
    readonly icon: JSX.Element;
    readonly label?: JSX.Element;
    readonly title?: string;
    readonly "data-samey-appearance"?: string;
    readonly "aria-expanded"?: "true" | "false";
} & FocusProps & MouseProps & KeyboardProps;
