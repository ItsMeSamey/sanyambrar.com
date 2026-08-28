import { useState } from "@keybr/solid-compat/react";
import { getScreenSize } from "../utils/geometry.ts";
import { type Size } from "../utils/size.ts";
import { useWindowEvent } from "./use-window-event.ts";
export const useScreenSize = (): Size => {
    const [size, setSize] = useState(getScreenSize());
    useWindowEvent("resize", () => {
        setSize(getScreenSize());
    });
    return size();
};
