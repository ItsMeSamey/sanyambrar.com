import { catchError } from "@keybr/debug";
import { createReactiveSettings, Settings, SettingsContext, type SettingsStorage } from "@keybr/settings";
import { type JSX } from "solid-js";

export function SettingsProvider(props: {
  readonly storage: SettingsStorage;
  readonly initialSettings: Settings;
  readonly children: JSX.Element;
}) {
  const snapshot = (value: Settings) => new Settings(value.toJSON(), value.isNew);
  const state = createReactiveSettings(snapshot(props.initialSettings));
  const value = {
    settings: state.settings,
    updateSettings(newSettings: Settings) {
      const next = snapshot(newSettings);
      state.replace(next);
      props.storage.store(next).catch(catchError);
    },
  };
  return <SettingsContext.Provider value={value}>{props.children}</SettingsContext.Provider>;
}
