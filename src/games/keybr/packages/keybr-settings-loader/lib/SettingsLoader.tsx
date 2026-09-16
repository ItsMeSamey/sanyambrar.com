import { catchError } from "@keybr/debug";
import { Settings, type SettingsStorage } from "@keybr/settings";
import { createMemo, Loading, Show } from 'solid-js';
import { type JSX } from '@solidjs/web';
import { SettingsProvider } from "./internal/SettingsProvider.tsx";

export function SettingsLoader(props: { readonly children: JSX.Element; readonly fallback?: JSX.Element }) {
  const storage = createMemo<SettingsStorage>(() => {
    const key = "settings";
    const read = (): Settings => {
      try {
        const value = localStorage.getItem(key);
        if (value != null) return new Settings(JSON.parse(value));
      } catch {}
      const settings = new Settings(undefined, true);
      localStorage.setItem(key, JSON.stringify(settings.toJSON()));
      return settings;
    };
    return {
      async load() { return read(); },
      async store(settings) {
        localStorage.setItem(key, JSON.stringify(settings.toJSON()));
        return settings;
      },
    };
  });
  const settings = createMemo(() => storage().load().catch((error) => {
    catchError(error);
    throw error;
  }));
  return (
    <Loading fallback={props.fallback ?? null}>
    <Show keyed when={settings()}>
      {(value) => (
        <SettingsProvider storage={storage()} initialSettings={value}>
          {props.children}
        </SettingsProvider>
      )}
    </Show>
    </Loading>
  );
}
