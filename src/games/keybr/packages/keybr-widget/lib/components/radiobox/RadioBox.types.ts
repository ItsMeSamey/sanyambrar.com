import { type CheckableInputProps } from "../Checkable.tsx";
import { type Focusable } from "../types.ts";

export type RadioBoxProps = CheckableInputProps & {
  readonly onSelect?: (value?: string) => void;
};
export type RadioBoxRef = Focusable;
