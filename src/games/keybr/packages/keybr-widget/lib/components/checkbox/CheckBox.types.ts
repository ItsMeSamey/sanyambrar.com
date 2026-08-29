import { type ReactNode, type RefObject } from "@keybr/solid-compat/react";
import { type Focusable, type FocusProps } from "../types.ts";

export type CheckBoxProps = {
  readonly checked?: boolean;
  readonly children?: ReactNode;
  readonly label?: ReactNode;
  readonly name?: string;
  readonly ref?: RefObject<Focusable | null>;
  readonly title?: string;
  readonly value?: string;
  readonly onChange?: (checked: boolean) => void;
} & FocusProps;

export type CheckBoxRef = Focusable;
