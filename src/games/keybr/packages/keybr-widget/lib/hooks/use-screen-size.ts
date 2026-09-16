import { createSignal } from 'solid-js';
import { liveObject } from "@keybr/solid-compat/live";

import { getScreenSize } from "../utils/geometry.ts";
import { type Size } from "../utils/size.ts";
import { useWindowEvent } from "./use-window-event.ts";
export const useScreenSize = (): Size => {
    const [size, setSize] = createSignal(getScreenSize());
    useWindowEvent("resize", () => {
        setSize(getScreenSize());
    });
    return liveObject(size);
};
