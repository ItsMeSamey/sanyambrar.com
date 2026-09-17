import { type Accessor, createSignal } from 'solid-js';
import { getScreenSize } from "../utils/geometry.ts";
import { type Size } from "../utils/size.ts";
import { useWindowEvent } from "./use-window-event.ts";
export const useScreenSize = (): Accessor<Size> => {
    const [size, setSize] = createSignal(getScreenSize());
    useWindowEvent("resize", () => {
        setSize(getScreenSize());
    });
    return size;
};
