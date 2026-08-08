export type ThemeOption<T extends string = string> = {
  readonly id: T;
  readonly name: string;
};

export const COLORS = [
  { id: "system", name: "System" },
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
  { id: "gray", name: "Gray" },
  { id: "yellow", name: "Yellow" },
  { id: "garden", name: "Garden" },
  { id: "coffee", name: "Coffee" },
  { id: "chocolate", name: "Chocolate" },
  { id: "honey", name: "Honey" },
] as const satisfies readonly ThemeOption[];

export const FONTS = [
  { id: "sans-serif", name: "Sans serif" },
  { id: "serif", name: "Serif" },
  { id: "monospace", name: "Monospace" },
  { id: "cursive", name: "Cursive" },
] as const satisfies readonly ThemeOption[];

export type ThemeColor = (typeof COLORS)[number]["id"];
export type ThemeFont = (typeof FONTS)[number]["id"];

export function colorTheme(id: unknown): ThemeColor {
  return COLORS.find((item) => item.id === id)?.id ?? COLORS[0].id;
}

export function fontTheme(id: unknown): ThemeFont {
  return FONTS.find((item) => item.id === id)?.id ?? FONTS[0].id;
}
