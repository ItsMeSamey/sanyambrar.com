export type ThemeOption<T extends string = string> = {
  readonly id: T;
  readonly name: string;
};

export const COLORS = [
  { id: "light", name: "Light" },
  { id: "light-contrast", name: "Light High Contrast" },
  { id: "dark", name: "Dark" },
  { id: "dark-contrast", name: "Dark High Contrast" },
  { id: "custom", name: "Custom…" },
] as const satisfies readonly ThemeOption[];

export const FONTS = [
  { id: "sans-serif", name: "Sans serif" },
  { id: "serif", name: "Serif" },
  { id: "monospace", name: "Monospace" },
  { id: "cursive", name: "Cursive" },
] as const satisfies readonly ThemeOption[];

export type ThemeColor = (typeof COLORS)[number]["id"];
export type ThemeFont = (typeof FONTS)[number]["id"];
export type CustomThemeTone = "light" | "dark";

export type CustomThemeColors = {
  readonly tone: CustomThemeTone;
  readonly background: string;
  readonly text: string;
  readonly accent: string;
  readonly error: string;
  readonly slow: string;
  readonly fast: string;
  readonly effort: string;
};

export const LIGHT_CUSTOM_THEME: CustomThemeColors = {
  tone: "light",
  background: "#f4f0f0",
  text: "#282640",
  accent: "#3d475c",
  error: "#ff3333",
  slow: "#cc0000",
  fast: "#60d788",
  effort: "#6699ff",
};

export const DARK_CUSTOM_THEME: CustomThemeColors = {
  tone: "dark",
  background: "#333333",
  text: "#9f9999",
  accent: "#6c6666",
  error: "#9b4545",
  slow: "#8c1818",
  fast: "#448154",
  effort: "#2d4a86",
};

export type CustomThemeColorName = Exclude<keyof CustomThemeColors, "tone">;

export function colorTheme(id: unknown): ThemeColor {
  return COLORS.find((item) => item.id === id)?.id ?? defaultColorTheme();
}

export function defaultColorTheme(): ThemeColor {
  try {
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function fontTheme(id: unknown): ThemeFont {
  return FONTS.find((item) => item.id === id)?.id ?? FONTS[0].id;
}

export function customTheme(value: unknown): CustomThemeColors {
  if (value == null || typeof value !== "object") {
    return LIGHT_CUSTOM_THEME;
  }
  const data = value as Record<string, unknown>;
  return {
    tone: data.tone === "dark" ? "dark" : "light",
    background: hexColor(data.background, LIGHT_CUSTOM_THEME.background),
    text: hexColor(data.text, LIGHT_CUSTOM_THEME.text),
    accent: hexColor(data.accent, LIGHT_CUSTOM_THEME.accent),
    error: hexColor(data.error, LIGHT_CUSTOM_THEME.error),
    slow: hexColor(data.slow, LIGHT_CUSTOM_THEME.slow),
    fast: hexColor(data.fast, LIGHT_CUSTOM_THEME.fast),
    effort: hexColor(data.effort, LIGHT_CUSTOM_THEME.effort),
  };
}

function hexColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : fallback;
}
