import type { JSX } from "@solidjs/web";
import { type FocusProps } from "../types.ts";

export type CheckBoxProps = {
  readonly checked?: boolean;
  readonly children?: JSX.Element;
  readonly label?: JSX.Element;
  readonly name?: string;
  readonly title?: string;
  readonly value?: string;
  readonly onChange?: (checked: boolean) => void;
} & FocusProps;
