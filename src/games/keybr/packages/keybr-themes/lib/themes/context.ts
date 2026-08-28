import { createContext, useContext } from "solid-js";

export type ThemeValue = {
  readonly color: string;
  readonly font: string;
  readonly hash: number;
};

export const ThemeContext = createContext<ThemeValue>({ color: "light", font: "sans-serif", hash: 0 });
export function useTheme(): ThemeValue { return useContext(ThemeContext); }
