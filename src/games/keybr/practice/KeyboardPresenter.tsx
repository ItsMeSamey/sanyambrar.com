import type { JSX } from "@solidjs/web";
import { keyboardProps } from "../keyboard/settings.ts";
import { useKeyboard } from "../keyboard/context.tsx";
import { flatten, HeatmapLayer } from "../keyboard-ui/HeatmapLayer.tsx";
import { KeyLayer } from "../keyboard-ui/KeyLayer.tsx";
import { PointersLayer } from "../keyboard-ui/PointersLayer.tsx";
import { TransitionsLayer } from "../keyboard-ui/TransitionsLayer.tsx";
import { VirtualKeyboard } from "../keyboard-ui/VirtualKeyboard.tsx";
import { ZonesLayer } from "../keyboard-ui/ZonesLayer.tsx";
import { useSettings } from "../settings/context.ts";
import { type CodePoint } from "../unicode/types.ts";

import { type LastLesson } from "./state/last-lesson.ts";
export const KeyboardPresenter = function KeyboardPresenter(props: {
    readonly focus: boolean;
    readonly depressedKeys: readonly string[];
    readonly suffix: readonly CodePoint[];
    readonly lastLesson: LastLesson | null;
}): JSX.Element {
    const { settings } = useSettings();
    const keyboard = useKeyboard();
    const colors = () => settings.get(keyboardProps.colors);
    const pointers = () => settings.get(keyboardProps.pointers);
    const hasLastLesson = () => props.lastLesson != null;
    return (<VirtualKeyboard keyboard={keyboard()} height="16rem">
      <KeyLayer depressedKeys={props.depressedKeys} showColors={colors()}/>
      {!hasLastLesson() && props.focus && props.depressedKeys.length === 0 && pointers() && <PointersLayer suffix={props.suffix}/>}
      {props.lastLesson && (<HeatmapLayer histogram={flatten(props.lastLesson.misses)} modifier="m"/>)}
      {props.lastLesson && (<HeatmapLayer histogram={flatten(props.lastLesson.hits)} modifier="h"/>)}
      {props.lastLesson && (<TransitionsLayer histogram={props.lastLesson.misses2} modifier="m"/>)}
      {props.lastLesson && (<TransitionsLayer histogram={props.lastLesson.hits2} modifier="h"/>)}
      {!hasLastLesson() && !props.focus && <ZonesLayer />}
    </VirtualKeyboard>);
};
