import { useSettings } from "@keybr/settings";
import { type Accessor, createContext, createMemo, useContext } from 'solid-js';
import { type JSX } from '@solidjs/web';
import { type Keyboard } from "./keyboard.ts";
import { loadKeyboard } from "./load.ts";
import { KeyboardOptions } from "./settings.ts";

export const KeyboardContext = createContext<Accessor<Keyboard>>();
export function useKeyboard(): Accessor<Keyboard> {
  const value = useContext(KeyboardContext);
  if (value == null) throw new Error(process.env.NODE_ENV !== "production" ? "KeyboardContext is missing" : undefined);
  return value;
}

export function KeyboardProvider(props: { readonly children: JSX.Element }) {
  const { settings } = useSettings();
  const keyboard = createMemo(() => loadKeyboard(KeyboardOptions.from(settings)));
  return <KeyboardContext value={keyboard}>{props.children}</KeyboardContext>;
}
