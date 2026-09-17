import { onSettled } from "solid-js";

export const useDocumentEvent = <K extends keyof DocumentEventMap>(
  type: K,
  listener: (this: Document, event: DocumentEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
): void => {
  onSettled(() => {
    const handler = (event: DocumentEventMap[K]) => listener.call(document, event);
    document.addEventListener(type, handler as EventListener, options);
    return () => document.removeEventListener(type, handler as EventListener, options);
  });
};
