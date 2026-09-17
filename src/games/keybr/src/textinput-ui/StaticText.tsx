import type { JSX } from "@solidjs/web";
import { type LineList, type TextDisplaySettings } from "@keybr/textinput";

import { TextLines, type TextLineSize } from "./TextLines.tsx";
export function StaticText(props: {
    readonly settings?: TextDisplaySettings;
    readonly lines: LineList;
    readonly wrap?: boolean;
    readonly size?: TextLineSize;
    readonly cursor?: boolean;
    readonly focus?: boolean;
}): JSX.Element {
    return (<TextLines settings={props.settings} lines={props.lines} wrap={props.wrap} size={props.size} cursor={(props.cursor === undefined ? false : props.cursor)} focus={(props.focus === undefined ? true : props.focus)}/>);
}
