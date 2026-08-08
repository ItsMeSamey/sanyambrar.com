import { createContext, useContext } from "react";

export type ThemeValue = {
  readonly color: "system";
  readonly font: "sans-serif";
  readonly hash: 0;
};

export const ThemeContext = createContext<ThemeValue>({
  color: "system",
  font: "sans-serif",
  hash: 0,
});

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
