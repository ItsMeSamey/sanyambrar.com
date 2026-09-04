import { useEffect, useRef } from "@keybr/solid-compat/react";
export const useWindowEvent = <K extends keyof WindowEventMap>(type: K, listener: (this: Window, ev: WindowEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void => {
    const listenerRef = useRef(listener);
    listenerRef.current = listener;
    useEffect(() => {
        const handler = (ev: WindowEventMap[K]): void => {
            listenerRef.current?.call(window, ev);
        };
        window.addEventListener(type, handler as EventListener, options);
        return () => {
            window.removeEventListener(type, handler as EventListener);
        };
    }, () => [type, options]);
};
