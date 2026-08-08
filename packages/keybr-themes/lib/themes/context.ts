import { createContext, useContext } from "react";
import { type ThemeColor, type ThemeFont } from "./themes.ts";

export type ThemeValue = {
  readonly color: ThemeColor;
  readonly font: ThemeFont;
  readonly hash: number;
  readonly switchColor: (color: ThemeColor) => void;
  readonly switchFont: (font: ThemeFont) => void;
};

export const ThemeContext = createContext<ThemeValue>({
  color: "system",
  font: "sans-serif",
  hash: 0,
  switchColor: () => {},
  switchFont: () => {},
});

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
