import { type ReactNode, useState } from "react";
import { ThemeContext } from "./context.ts";
import {
  colorTheme,
  fontTheme,
  type ThemeColor,
  type ThemeFont,
} from "./themes.ts";

const storageKey = "keybr.theme";

type ThemePrefs = {
  readonly color: ThemeColor;
  readonly font: ThemeFont;
};

type ThemeState = ThemePrefs & {
  readonly hash: number;
};

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(() => {
    const prefs = readPrefs();
    applyPrefs(prefs);
    return { ...prefs, hash: 0 };
  });

  const update = (prefs: ThemePrefs) => {
    applyPrefs(prefs);
    storePrefs(prefs);
    setState((state) => ({ ...prefs, hash: state.hash + 1 }));
  };

  return (
    <ThemeContext.Provider
      value={{
        ...state,
        switchColor: (color) => update({ color, font: state.font }),
        switchFont: (font) => update({ color: state.color, font }),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

function readPrefs(): ThemePrefs {
  try {
    const value = localStorage.getItem(storageKey);
    if (value != null) {
      const data = JSON.parse(value) as Record<string, unknown>;
      return {
        color: colorTheme(data.color),
        font: fontTheme(data.font),
      };
    }
  } catch {
    // localStorage can be unavailable in locked-down browser contexts.
  }
  return { color: "system", font: "sans-serif" };
}

function storePrefs(prefs: ThemePrefs): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(prefs));
  } catch {
    // Theme persistence is optional; the active theme still works in-memory.
  }
}

function applyPrefs({ color, font }: ThemePrefs): void {
  const element = document.documentElement;
  element.dataset.color = color;
  element.dataset.font = font;
}
