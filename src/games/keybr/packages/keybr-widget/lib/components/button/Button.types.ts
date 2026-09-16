import type { JSX } from "@solidjs/web";
import { type RefObject } from "@keybr/solid-compat/react";
import { type SizeName } from "../../styles/index.ts";
import { type AnchorProps, type Focusable, type FocusProps, type KeyboardProps, type MouseProps, } from "../types.ts";
export type ButtonProps = {
    readonly autoFocus?: boolean;
    readonly children?: JSX.Element;
    readonly icon?: JSX.Element;
    readonly label?: JSX.Element;
    readonly ref?: RefObject<ButtonRef | null>;
    readonly size?: SizeName;
    readonly title?: string;
} & FocusProps & MouseProps & KeyboardProps & AnchorProps;
export type ButtonRef = Focusable;
