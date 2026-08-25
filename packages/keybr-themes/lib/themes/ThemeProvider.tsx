import { type ReactNode, useEffect, useState } from "react";
import { ThemeContext } from "./context.ts";
import {
  colorTheme,
  customTheme,
  defaultColorTheme,
  fontTheme,
  type CustomThemeColorName,
  type CustomThemeColors,
  type ThemeColor,
  type ThemeFont,
} from "./themes.ts";

const storageKey = "keybr.theme";
const fontStorageKey = "samey.font";

const customPropertyNames = [
  "--primary-d2",
  "--primary-d1",
  "--primary",
  "--primary-l1",
  "--primary-l2",
  "--secondary-d1",
  "--secondary",
  "--secondary-l1",
  "--secondary-l2",
  "--secondary-f1",
  "--secondary-f2",
  "--accent-d2",
  "--accent-d1",
  "--accent",
  "--accent-l1",
  "--accent-l2",
  "--error-d1",
  "--error",
  "--error-l1",
  "--shadow-color",
  "--slow-key-color",
  "--fast-key-color",
  "--effort-color",
  "--textinput__color",
  "--textinput--special__color",
  "--textinput--hit__color",
  "--textinput--miss__color",
  "--Name-color",
  "--Value-color",
  "--Value--more__color",
  "--Value--less__color",
  "--Chart-speed__color",
  "--Chart-accuracy__color",
  "--Chart-complexity__color",
  "--Chart-threshold__color",
  "--Chart-hist-h__color",
  "--Chart-hist-m__color",
  "--Chart-hist-r__color",
  "--KeyboardKey-pointer__color",
  "--pinky-zone-color",
  "--ring-zone-color",
  "--middle-zone-color",
  "--left-index-zone-color",
  "--right-index-zone-color",
  "--thumb-zone-color",
  "--syntax-keyword",
  "--syntax-string",
  "--syntax-number",
  "--syntax-comment",
] as const;

type ThemePrefs = {
  readonly color: ThemeColor;
  readonly font: ThemeFont;
  readonly custom: CustomThemeColors;
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

  const update = (patch: Partial<ThemePrefs>) => {
    const prefs = { ...readPrefs(), ...patch };
    applyPrefs(prefs);
    storePatch(patch, prefs);
    setState((state) => ({ ...prefs, hash: state.hash + 1 }));
  };

  const setCustomTheme = (custom: CustomThemeColors) => {
    update({ color: "custom", custom });
  };

  const setCustomColor = (name: CustomThemeColorName, value: string) => {
    if (!/^#[0-9a-f]{6}$/i.test(value)) {
      return;
    }
    const normalized = value.toLowerCase();
    const custom = readPrefs().custom;
    setCustomTheme({
      ...custom,
      ...(name === "background" ? { tone: toneForBackground(normalized) } : {}),
      [name]: normalized,
    });
  };

  useEffect(() => {
    const sync = () => {
      const prefs = readPrefs();
      applyPrefs(prefs);
      setState((state) => ({ ...prefs, hash: state.hash + 1 }));
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === fontStorageKey) sync();
    };
    addEventListener("samey-themechange", sync);
    addEventListener("storage", onStorage);
    return () => {
      removeEventListener("samey-themechange", sync);
      removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        ...state,
        switchColor: (color) => update({ color }),
        switchFont: (font) => update({ font }),
        setCustomColor,
        setCustomTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

function readPrefs(): ThemePrefs {
  try {
    const value = localStorage.getItem(storageKey);
    const data = value != null ? (JSON.parse(value) as Record<string, unknown>) : {};
    return {
      color: migrateColor(data.color),
      font: fontTheme(localStorage.getItem(fontStorageKey) ?? data.font),
      custom: customTheme(data.custom),
    };
  } catch {
    // localStorage can be unavailable in locked-down browser contexts.
  }
  return {
    color: defaultColorTheme(),
    font: "sans-serif",
    custom: customTheme(null),
  };
}

function migrateColor(value: unknown): ThemeColor {
  switch (value) {
    case "system":
      return defaultColorTheme();
    case "chocolate":
      return "dark";
    case "gray":
    case "yellow":
    case "garden":
    case "coffee":
    case "honey":
      return "light";
    default:
      return colorTheme(value);
  }
}

function storePatch(patch: Partial<ThemePrefs>, prefs: ThemePrefs): void {
  try {
    if (patch.color !== undefined || patch.custom !== undefined) {
      const value = localStorage.getItem(storageKey);
      const stored = value != null ? (JSON.parse(value) as Record<string, unknown>) : {};
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          color: patch.color ?? stored.color ?? prefs.color,
          custom: patch.custom ?? customTheme(stored.custom),
        }),
      );
    }
    if (patch.font !== undefined) {
      localStorage.setItem(fontStorageKey, patch.font);
    }
  } catch {
    // Appearance persistence is optional; the active values still work in-memory.
  }
}

function applyPrefs({ color, font, custom }: ThemePrefs): void {
  const element = document.documentElement;
  clearCustomTheme(element.style);
  element.dataset.color = color;
  element.dataset.font = font;
  if (color === "custom") {
    applyCustomTheme(custom, element.style);
  }
}

function clearCustomTheme(style: CSSStyleDeclaration): void {
  for (const name of customPropertyNames) {
    style.removeProperty(name);
  }
}

function applyCustomTheme(
  theme: CustomThemeColors,
  style: CSSStyleDeclaration,
): void {
  const dark = theme.tone === "dark";
  const primary = theme.background;
  const secondary = theme.text;
  const accent = theme.accent;
  const error = theme.error;
  const chartMix = dark ? 0.5 : 0;

  const props: Record<(typeof customPropertyNames)[number], string> = {
    "--primary-d2": mix(primary, dark ? "#ffffff" : "#000000", 0.1),
    "--primary-d1": mix(primary, dark ? "#ffffff" : "#000000", 0.05),
    "--primary": primary,
    "--primary-l1": mix(primary, dark ? "#000000" : "#ffffff", dark ? 0.02 : 0.03),
    "--primary-l2": mix(primary, dark ? "#000000" : "#ffffff", dark ? 0.03 : 0.05),
    "--secondary-d1": mix(secondary, dark ? "#ffffff" : "#000000", 0.1),
    "--secondary": secondary,
    "--secondary-l1": mix(secondary, dark ? "#000000" : "#ffffff", 0.1),
    "--secondary-l2": mix(secondary, dark ? "#000000" : "#ffffff", 0.2),
    "--secondary-f1": mix(secondary, primary, 0.2),
    "--secondary-f2": mix(secondary, primary, 0.4),
    "--accent-d2": mix(accent, "#000000", dark ? 0.1 : 0.2),
    "--accent-d1": mix(accent, "#000000", dark ? 0.05 : 0.1),
    "--accent": accent,
    "--accent-l1": mix(accent, "#ffffff", dark ? 0.05 : 0.1),
    "--accent-l2": mix(accent, "#ffffff", dark ? 0.1 : 0.2),
    "--error-d1": mix(error, dark ? "#ffffff" : "#000000", 0.1),
    "--error": error,
    "--error-l1": mix(error, dark ? "#000000" : "#ffffff", 0.1),
    "--shadow-color": dark ? "#00000088" : "#00000044",
    "--slow-key-color": theme.slow,
    "--fast-key-color": theme.fast,
    "--effort-color": theme.effort,
    "--textinput__color": secondary,
    "--textinput--special__color": mix(secondary, primary, 0.5),
    "--textinput--hit__color": mix(secondary, primary, 0.4),
    "--textinput--miss__color": error,
    "--Name-color": mix(secondary, "#ffffff", 0.2),
    "--Value-color": mix(secondary, "#000000", 0.1),
    "--Value--more__color": "#2a7e21",
    "--Value--less__color": "#a1464e",
    "--Chart-speed__color": mix("#6fb48c", primary, chartMix),
    "--Chart-accuracy__color": mix("#ef522f", primary, chartMix),
    "--Chart-complexity__color": mix("#ac71d0", primary, chartMix),
    "--Chart-threshold__color": mix("#d2649a", primary, chartMix),
    "--Chart-hist-h__color": mix("#5f6cb4", primary, chartMix),
    "--Chart-hist-m__color": mix("#b43f3e", primary, chartMix),
    "--Chart-hist-r__color": mix("#b140b4", primary, chartMix),
    "--KeyboardKey-pointer__color": "#4ba0f2",
    "--pinky-zone-color": mix("#8ec07c", primary, chartMix),
    "--ring-zone-color": mix("#b8bb26", primary, chartMix),
    "--middle-zone-color": mix("#fabd2f", primary, chartMix),
    "--left-index-zone-color": mix("#83a698", primary, chartMix),
    "--right-index-zone-color": mix("#d3869b", primary, chartMix),
    "--thumb-zone-color": mix("#d66354", primary, chartMix),
    "--syntax-keyword": dark ? "#5991cd" : "#56a1f4",
    "--syntax-string": "#72b172",
    "--syntax-number": dark ? "#b281d3" : "#763a9e",
    "--syntax-comment": "#9f8484",
  };

  for (const [name, value] of Object.entries(props)) {
    style.setProperty(name, value);
  }
}

function mix(a: string, b: string, bWeight: number): string {
  const aa = rgb(a);
  const bb = rgb(b);
  const weight = Math.max(0, Math.min(1, bWeight));
  return `#${[0, 1, 2]
    .map((index) =>
      Math.round(aa[index] * (1 - weight) + bb[index] * weight)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function rgb(value: string): readonly [number, number, number] {
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}

function toneForBackground(value: string): "light" | "dark" {
  const [r, g, b] = rgb(value).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.35 ? "dark" : "light";
}
