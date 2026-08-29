import { type RefObject, useEffect, useState } from "@keybr/solid-compat/react";
import { getElementSize } from "../utils/geometry.ts";
import { type Size } from "../utils/size.ts";

export type ElementResizeCallback = (entry: ResizeObserverEntry) => void;
const observed = new WeakMap<Element, ElementResizeCallback>();
let resizeObserver: ResizeObserver | null = null;
const getResizeObserver = (): ResizeObserver => {
    if (resizeObserver == null) {
        resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const callback = observed.get(entry.target);
                if (callback != null) callback(entry);
            }
        });
    }
    return resizeObserver;
};
export const onElementResize = (element: Element, callback: ElementResizeCallback): (() => void) => {
    const resizeObserver = getResizeObserver();
    observed.set(element, callback);
    resizeObserver.observe(element);
    return () => {
        observed.delete(element);
        resizeObserver.unobserve(element);
    };
};

// React rerenders consumers when this state changes. Solid does not, so returning
// size() here would permanently hand callers the initial null snapshot. Keep the
// signal as an accessor and let callers read it inside their reactive effects.
export const useElementSize = (ref: RefObject<Element | null>): (() => Size | null) => {
    const [size, setSize] = useState<Size | null>(null);
    useEffect(() => {
        const element = ref.current;
        if (element == null) return;
        const update = () => {
            const newSize = getElementSize(element);
            const oldSize = size();
            if (oldSize == null || !oldSize.eq(newSize)) setSize(newSize);
        };
        update();
        return onElementResize(element, update);
    }, []);
    return size;
};
