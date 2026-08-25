import { mdiCheckboxBlankOutline, mdiCheckboxMarkedOutline } from "@mdi/js";
import { type ReactNode } from "react";
import { Checkable } from "../Checkable.tsx";
import { type CheckBoxProps } from "./CheckBox.types.ts";

export function CheckBox(props: CheckBoxProps): ReactNode {
  return <Checkable {...props} type="checkbox" iconOff={mdiCheckboxBlankOutline} iconOn={mdiCheckboxMarkedOutline} />;
}
