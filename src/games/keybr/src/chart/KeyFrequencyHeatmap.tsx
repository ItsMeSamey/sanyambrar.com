import type { JSX } from "@solidjs/web";
import { type Keyboard } from "@keybr/keyboard";
import { flatten, HeatmapLayer, KeyLayer, VirtualKeyboard, } from "@keybr/keyboard-ui";
import { type KeyStatsMap } from "@keybr/result";

import { createMemo } from 'solid-js';
import { keyUsage } from "./keyusage.ts";
export function KeyFrequencyHeatmap(props: {
    readonly keyStatsMap: KeyStatsMap;
    readonly keyboard: Keyboard;
}): JSX.Element {
    const usage = createMemo(() => keyUsage(props.keyStatsMap));
    return (<VirtualKeyboard keyboard={props.keyboard}>
      <KeyLayer />
      <HeatmapLayer histogram={flatten(usage().miss)} modifier="m"/>
      <HeatmapLayer histogram={flatten(usage().hit)} modifier="h"/>
    </VirtualKeyboard>);
}
