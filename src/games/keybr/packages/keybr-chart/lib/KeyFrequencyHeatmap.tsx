import { type Keyboard } from "@keybr/keyboard";
import { flatten, HeatmapLayer, KeyLayer, VirtualKeyboard, } from "@keybr/keyboard-ui";
import { type KeyStatsMap } from "@keybr/result";
import { type ReactNode } from "@keybr/solid-compat/react";
import { keyUsage } from "./keyusage.ts";
export function KeyFrequencyHeatmap(solidProps: {
    readonly keyStatsMap: KeyStatsMap;
    readonly keyboard: Keyboard;
}): ReactNode {
    const { hit, miss } = keyUsage(solidProps.keyStatsMap);
    return (<VirtualKeyboard keyboard={solidProps.keyboard}>
      <KeyLayer />
      <HeatmapLayer histogram={flatten(miss)} modifier="m"/>
      <HeatmapLayer histogram={flatten(hit)} modifier="h"/>
    </VirtualKeyboard>);
}
