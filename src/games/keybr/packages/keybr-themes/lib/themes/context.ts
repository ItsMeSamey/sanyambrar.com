import { type Accessor, createContext, useContext } from 'solid-js';

export type ThemeValue = {
  readonly color: string;
  readonly font: string;
  readonly hash: number;
};

const defaultTheme: ThemeValue = { color: "light", font: "sans-serif", hash: 0 };
export const ThemeContext = createContext<Accessor<ThemeValue>>(() => defaultTheme);
export function useTheme(): Accessor<ThemeValue> { return useContext(ThemeContext); }
