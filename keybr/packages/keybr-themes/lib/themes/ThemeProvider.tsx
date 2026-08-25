import { type ReactNode, useEffect, useState } from "react";
import { ThemeContext, type ThemeValue } from "./context.ts";

type AppearanceSnapshot = {
  readonly color: string;
  readonly font: string;
};

type AppearanceApi = {
  get(): AppearanceSnapshot;
};

declare global {
  var SameyAppearance: AppearanceApi | undefined;
}

function readTheme(): Omit<ThemeValue, "hash"> {
  const api = globalThis.SameyAppearance;
  if (api == null) throw new Error("Shared appearance runtime is not loaded");
  const { color, font } = api.get();
  return { color, font };
}

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<ThemeValue>(() => ({ ...readTheme(), hash: 0 }));

  useEffect(() => {
    const sync = () => setState(({ hash }) => ({ ...readTheme(), hash: hash + 1 }));
    addEventListener("samey-themechange", sync);
    return () => removeEventListener("samey-themechange", sync);
  }, []);

  return <ThemeContext.Provider value={state}>{children}</ThemeContext.Provider>;
}
