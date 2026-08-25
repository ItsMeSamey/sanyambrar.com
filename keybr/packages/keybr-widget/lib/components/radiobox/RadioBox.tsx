import { mdiRadioboxBlank, mdiRadioboxMarked } from "@mdi/js";
import { type ReactNode } from "react";
import { Checkable } from "../Checkable.tsx";
import { type RadioBoxProps } from "./RadioBox.types.ts";

export function RadioBox(props: RadioBoxProps): ReactNode {
  return <Checkable {...props} type="radio" iconOff={mdiRadioboxBlank} iconOn={mdiRadioboxMarked} />;
}
