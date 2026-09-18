import { catchError } from "../debug/logger.ts";
import { errorMessage, errorWithCause } from "../../../shared/error.ts";
import { createMemo, Loading, Show } from "solid-js";
import { type JSX } from "@solidjs/web";
import { SettingsContext } from "./context.ts";
import { Settings, type SettingsStorage } from "./settings.ts";
import { createSettingsState } from "./state.ts";

export function SettingsLoader(props: { readonly children: JSX.Element; readonly fallback?: JSX.Element }) {
  const storage = createMemo<SettingsStorage>(() => {
    const key = "settings";
    const read = (): Settings => {
      let value: string | null;
      try {
        value = localStorage.getItem(key);
      } catch (error) {
        throw errorWithCause(`Could not read Keybr settings: ${errorMessage(error)}`, error);
      }
      if (value != null) {
        try {
          return new Settings(JSON.parse(value));
        } catch (error) {
          throw errorWithCause(`Keybr settings are invalid: ${errorMessage(error)}`, error);
        }
      }
      const settings = new Settings(undefined, true);
      try {
        localStorage.setItem(key, JSON.stringify(settings.toJSON()));
      } catch (error) {
        throw errorWithCause(`Could not initialize Keybr settings: ${errorMessage(error)}`, error);
      }
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
  return <Loading fallback={props.fallback ?? null}>
    <Show keyed when={settings()}>{value =>
      <SettingsProvider storage={storage()} initialSettings={value}>{props.children}</SettingsProvider>
    }</Show>
  </Loading>;
}

function SettingsProvider(props: {
  readonly storage: SettingsStorage;
  readonly initialSettings: Settings;
  readonly children: JSX.Element;
}) {
  const snapshot = (value: Settings) => new Settings(value.toJSON(), value.isNew);
  const state = createSettingsState(snapshot(props.initialSettings));
  const value = {
    settings: state.settings,
    updateSettings(newSettings: Settings) {
      const next = snapshot(newSettings);
      state.replace(next);
      props.storage.store(next).catch(catchError);
    },
  };
  return <SettingsContext value={value}>{props.children}</SettingsContext>;
}
