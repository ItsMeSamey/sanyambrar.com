import { createSignal, onSettled } from 'solid-js';
import { type JSX } from '@solidjs/web';
import { liveObject } from "@keybr/solid-compat/live";
import { ThemeContext, type ThemeValue } from "./context.ts";

function readTheme(): Omit<ThemeValue, "hash"> {
  const api = globalThis.SameyAppearance;
  if (api == null) throw new Error("Shared appearance runtime is not loaded");
  const { color, font } = api.get();
  return { color, font };
}

export function ThemeProvider(props: { readonly children: JSX.Element }) {
  const [state, setState] = createSignal<ThemeValue>({ ...readTheme(), hash: 0 }, { equals: false });
  onSettled(() => {
    const sync = () => setState(({ hash }) => ({ ...readTheme(), hash: hash + 1 }));
    addEventListener("samey-themechange", sync);
    return () => removeEventListener("samey-themechange", sync);
  });
  const value = liveObject(state);
  return <ThemeContext value={value}>{props.children}</ThemeContext>;
}
