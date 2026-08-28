import { mdiRadioboxBlank, mdiRadioboxMarked } from "@keybr/solid-compat/mdi";
import { type ReactNode } from "@keybr/solid-compat/react";
import { Checkable } from "../Checkable.tsx";
import { type RadioBoxProps } from "./RadioBox.types.ts";
export function RadioBox(props: RadioBoxProps): ReactNode {
    return <Checkable {...props} type="radio" iconOff={mdiRadioboxBlank} iconOn={mdiRadioboxMarked}/>;
}
