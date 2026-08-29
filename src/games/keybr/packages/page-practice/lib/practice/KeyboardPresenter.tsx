import { keyboardProps, useKeyboard } from "@keybr/keyboard";
import { flatten, HeatmapLayer, KeyLayer, PointersLayer, TransitionsLayer, VirtualKeyboard, ZonesLayer, } from "@keybr/keyboard-ui";
import { useSettings } from "@keybr/settings";
import { type CodePoint } from "@keybr/unicode";
import { withDeferred } from "@keybr/widget";
import { memo, type ReactNode } from "@keybr/solid-compat/react";
import { type LastLesson } from "./state/index.ts";
export const KeyboardPresenter = memo(function KeyboardPresenter(props: {
    readonly focus: boolean;
    readonly depressedKeys: readonly string[];
    readonly toggledKeys: readonly string[];
    readonly suffix: readonly CodePoint[];
    readonly lastLesson: LastLesson | null;
}): ReactNode {
    const { settings } = useSettings();
    const keyboard = useKeyboard();
    const colors = settings.get(keyboardProps.colors);
    const pointers = settings.get(keyboardProps.pointers);
    return (<VirtualKeyboard keyboard={keyboard} height="16rem">
      <KeyLayer depressedKeys={props.depressedKeys} toggledKeys={props.toggledKeys} showColors={colors}/>
      {props.focus && pointers && <PointersLayer suffix={props.suffix}/>}
      {props.focus && props.lastLesson && (<HeatmapLayer histogram={flatten(props.lastLesson.misses)} modifier="m"/>)}
      {props.focus && props.lastLesson && (<HeatmapLayer histogram={flatten(props.lastLesson.hits)} modifier="h"/>)}
      {props.focus && props.lastLesson && (<TransitionsLayer histogram={props.lastLesson.misses2} modifier="m"/>)}
      {props.focus && props.lastLesson && (<TransitionsLayer histogram={props.lastLesson.hits2} modifier="h"/>)}
      {props.focus || <ZonesLayer />}
    </VirtualKeyboard>);
});
export const DeferredKeyboardPresenter = withDeferred(KeyboardPresenter);
