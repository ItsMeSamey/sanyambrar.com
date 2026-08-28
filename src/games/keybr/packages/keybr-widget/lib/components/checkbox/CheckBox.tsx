import { mdiCheckboxBlankOutline, mdiCheckboxMarkedOutline } from "@keybr/solid-compat/mdi";
import { type ReactNode } from "@keybr/solid-compat/react";
import { Checkable } from "../Checkable.tsx";
import { type CheckBoxProps } from "./CheckBox.types.ts";
export function CheckBox(props: CheckBoxProps): ReactNode {
    return <Checkable {...props} type="checkbox" iconOff={mdiCheckboxBlankOutline} iconOn={mdiCheckboxMarkedOutline}/>;
}
