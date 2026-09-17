import { onSettled } from "solid-js";

export const useWindowEvent = <K extends keyof WindowEventMap>(
  type: K,
  listener: (this: Window, event: WindowEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
): void => {
  onSettled(() => {
    const handler = (event: WindowEventMap[K]) => listener.call(window, event);
    window.addEventListener(type, handler as EventListener, options);
    return () => window.removeEventListener(type, handler as EventListener, options);
  });
};
