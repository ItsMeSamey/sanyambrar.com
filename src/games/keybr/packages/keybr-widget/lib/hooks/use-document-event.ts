import { useEffect, useRef } from "@keybr/solid-compat/react";
export const useDocumentEvent = <K extends keyof DocumentEventMap>(type: K, listener: (this: Document, ev: DocumentEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void => {
    const listenerRef = useRef(listener);
    listenerRef.current = listener;
    useEffect(() => {
        const handler = (ev: DocumentEventMap[K]): void => {
            listenerRef.current?.call(document, ev);
        };
        document.addEventListener(type, handler as EventListener, options);
        return () => {
            document.removeEventListener(type, handler as EventListener);
        };
    }, () => [type, options]);
};
