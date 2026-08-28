import { createSignal, onCleanup, onMount, type JSX } from "solid-js";
import { liveObject } from "@keybr/solid-compat/live";
import { ThemeContext, type ThemeValue } from "./context.ts";

type AppearanceSnapshot = { readonly color: string; readonly font: string };
type AppearanceApi = { get(): AppearanceSnapshot };
declare global { var SameyAppearance: AppearanceApi | undefined; }

function readTheme(): Omit<ThemeValue, "hash"> {
  const api = globalThis.SameyAppearance;
  if (api == null) throw new Error("Shared appearance runtime is not loaded");
  const { color, font } = api.get();
  return { color, font };
}

export function ThemeProvider(props: { readonly children: JSX.Element }) {
  const [state, setState] = createSignal<ThemeValue>({ ...readTheme(), hash: 0 }, { equals: false });
  onMount(() => {
    const sync = () => setState(({ hash }) => ({ ...readTheme(), hash: hash + 1 }));
    addEventListener("samey-themechange", sync);
    onCleanup(() => removeEventListener("samey-themechange", sync));
  });
  const value = liveObject(state);
  return <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>;
}
