import { type LineList, type TextDisplaySettings } from "@keybr/textinput";
import { type ReactNode } from "@keybr/solid-compat/react";
import { TextLines, type TextLineSize } from "./TextLines.tsx";
export function StaticText(solidProps: {
    readonly settings?: TextDisplaySettings;
    readonly lines: LineList;
    readonly wrap?: boolean;
    readonly size?: TextLineSize;
    readonly cursor?: boolean;
    readonly focus?: boolean;
}): ReactNode {
    return (<TextLines settings={solidProps.settings} lines={solidProps.lines} wrap={solidProps.wrap} size={solidProps.size} cursor={(solidProps.cursor === undefined ? false : solidProps.cursor)} focus={(solidProps.focus === undefined ? true : solidProps.focus)}/>);
}
