import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
} from "react";

export const DynamicStylesContext = createContext({
  getStyledElement: (): HTMLElement => document.body,
});

export const useDynamicStyles = () => {
  return useContext(DynamicStylesContext);
};
