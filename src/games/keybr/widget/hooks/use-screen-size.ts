import { type Accessor, createSignal } from 'solid-js';
import { getScreenSize } from "../utils/geometry.ts";
import { type Size } from "../utils/size.ts";
import { useDocumentEvent } from "./use-document-event.ts";
import { useWindowEvent } from "./use-window-event.ts";
export const useScreenSize = (): Accessor<Size> => {
    const [size, setSize] = createSignal(getScreenSize());
    const update = () => setSize(getScreenSize());
    useWindowEvent("resize", update);
    // Fixed anchored overlays depend on viewport-relative geometry, so scrolling
    // invalidates placement even when the viewport dimensions are unchanged.
    useDocumentEvent("scroll", update, { capture: true, passive: true });
    return size;
};
