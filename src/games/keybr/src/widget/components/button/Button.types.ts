import type { JSX } from "@solidjs/web";
import { type SizeName } from "../../styles/index.ts";
import { type FocusProps, type KeyboardProps, type MouseProps, } from "../types.ts";
export type ButtonProps = {
    readonly autoFocus?: boolean;
    readonly children?: JSX.Element;
    readonly icon?: JSX.Element;
    readonly label?: JSX.Element;
    readonly size?: SizeName;
    readonly title?: string;
} & FocusProps & MouseProps & KeyboardProps;
