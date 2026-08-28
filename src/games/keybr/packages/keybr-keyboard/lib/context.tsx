import { useSettings } from "@keybr/settings";
import { liveObject } from "@keybr/solid-compat/live";
import { createContext, createMemo, type JSX, useContext } from "solid-js";
import { type Keyboard } from "./keyboard.ts";
import { loadKeyboard } from "./load.ts";
import { KeyboardOptions } from "./settings.ts";

export const KeyboardContext = createContext<Keyboard>();
export function useKeyboard(): Keyboard {
  const value = useContext(KeyboardContext);
  if (value == null) throw new Error(process.env.NODE_ENV !== "production" ? "KeyboardContext is missing" : undefined);
  return value;
}

export function KeyboardProvider(props: { readonly children: JSX.Element }) {
  const { settings } = useSettings();
  const keyboard = createMemo(() => loadKeyboard(KeyboardOptions.from(settings)));
  const value = liveObject(keyboard);
  return <KeyboardContext.Provider value={value}>{props.children}</KeyboardContext.Provider>;
}
