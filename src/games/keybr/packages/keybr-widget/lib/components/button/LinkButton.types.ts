import type { JSX } from "@solidjs/web";
import { type RefObject } from "@keybr/solid-compat/react";
import { type AnchorProps, type ClassName, type Focusable, type FocusProps, type KeyboardProps, type MouseProps, } from "../types.ts";
export type LinkButtonProps = {
    readonly children?: JSX.Element;
    readonly className?: ClassName;
    readonly label?: JSX.Element;
    readonly ref?: RefObject<LinkButtonRef | null>;
    readonly title?: string;
} & FocusProps & MouseProps & KeyboardProps & AnchorProps;
export type LinkButtonRef = Focusable;
