import { keyboardProps, useKeyboard } from "@keybr/keyboard";
import { flatten, HeatmapLayer, KeyLayer, PointersLayer, TransitionsLayer, VirtualKeyboard, ZonesLayer, } from "@keybr/keyboard-ui";
import { useSettings } from "@keybr/settings";
import { type CodePoint } from "@keybr/unicode";
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
    const colors = () => settings.get(keyboardProps.colors);
    const pointers = () => settings.get(keyboardProps.pointers);
    const hasLastLesson = () => props.lastLesson != null;
    return (<VirtualKeyboard keyboard={keyboard} height="16rem">
      <KeyLayer depressedKeys={props.depressedKeys} toggledKeys={props.toggledKeys} showColors={colors()}/>
      {!hasLastLesson() && props.focus && pointers() && <PointersLayer suffix={props.suffix}/>}
      {props.lastLesson && (<HeatmapLayer histogram={flatten(props.lastLesson.misses)} modifier="m"/>)}
      {props.lastLesson && (<HeatmapLayer histogram={flatten(props.lastLesson.hits)} modifier="h"/>)}
      {props.lastLesson && (<TransitionsLayer histogram={props.lastLesson.misses2} modifier="m"/>)}
      {props.lastLesson && (<TransitionsLayer histogram={props.lastLesson.hits2} modifier="h"/>)}
      {!hasLastLesson() && !props.focus && <ZonesLayer />}
    </VirtualKeyboard>);
});
// This used to go through the React-port `withDeferred` helper. Solid keeps a
// stable props proxy, so deferring that object captured the first values and
// left suffix/focus/lastLesson stale until unrelated lifecycle activity caused
// a remount. Keyboard feedback is cheap enough to publish directly.
export const DeferredKeyboardPresenter = KeyboardPresenter;
