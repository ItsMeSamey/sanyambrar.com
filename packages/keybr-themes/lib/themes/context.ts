import { createContext, useContext } from "react";
import {
  LIGHT_CUSTOM_THEME,
  type CustomThemeColorName,
  type CustomThemeColors,
  type ThemeColor,
  type ThemeFont,
} from "./themes.ts";

export type ThemeValue = {
  readonly color: ThemeColor;
  readonly font: ThemeFont;
  readonly custom: CustomThemeColors;
  readonly hash: number;
  readonly switchColor: (color: ThemeColor) => void;
  readonly switchFont: (font: ThemeFont) => void;
  readonly setCustomColor: (name: CustomThemeColorName, value: string) => void;
  readonly setCustomTheme: (theme: CustomThemeColors) => void;
};

export const ThemeContext = createContext<ThemeValue>({
  color: "light",
  font: "sans-serif",
  custom: LIGHT_CUSTOM_THEME,
  hash: 0,
  switchColor: () => {},
  switchFont: () => {},
  setCustomColor: () => {},
  setCustomTheme: () => {},
});

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
