import { createContext, type ReactNode, type RefObject, useContext, } from "@keybr/solid-compat/react";
export const DynamicStylesContext = createContext({
    getStyledElement: (): HTMLElement => document.body,
});
export const useDynamicStyles = () => {
    return useContext(DynamicStylesContext);
};
