import type { JSX } from "@solidjs/web";
import { type Keyboard } from "@keybr/keyboard";
import { flatten, HeatmapLayer, KeyLayer, VirtualKeyboard, } from "@keybr/keyboard-ui";
import { type KeyStatsMap } from "@keybr/result";

import { createMemo } from 'solid-js';
import { keyUsage } from "./keyusage.ts";
export function KeyFrequencyHeatmap(solidProps: {
    readonly keyStatsMap: KeyStatsMap;
    readonly keyboard: Keyboard;
}): JSX.Element {
    const usage = createMemo(() => keyUsage(solidProps.keyStatsMap));
    return (<VirtualKeyboard keyboard={solidProps.keyboard}>
      <KeyLayer />
      <HeatmapLayer histogram={flatten(usage().miss)} modifier="m"/>
      <HeatmapLayer histogram={flatten(usage().hit)} modifier="h"/>
    </VirtualKeyboard>);
}
