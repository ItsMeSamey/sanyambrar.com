import type { JSX } from "@solidjs/web";
import { type Keyboard } from "../keyboard/keyboard.ts";
import { flatten, HeatmapLayer } from "../keyboard-ui/HeatmapLayer.tsx";
import { KeyLayer } from "../keyboard-ui/KeyLayer.tsx";
import { VirtualKeyboard } from "../keyboard-ui/VirtualKeyboard.tsx";
import { type KeyStatsMap } from "../result/keystats.ts";

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
