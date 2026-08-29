import { catchError } from "@keybr/debug";
import { Settings, SettingsContext, type SettingsStorage } from "@keybr/settings";
import { liveObject } from "@keybr/solid-compat/live";
import { createSignal, type JSX } from "solid-js";

export function SettingsProvider(props: {
  readonly storage: SettingsStorage;
  readonly initialSettings: Settings;
  readonly children: JSX.Element;
}) {
  const snapshot = (value: Settings) => new Settings(value.toJSON(), value.isNew);
  const [settings, setSettings] = createSignal(snapshot(props.initialSettings), { equals: false });
  const liveSettings = liveObject(settings);
  const value = {
    settings: liveSettings,
    updateSettings(newSettings: Settings) {
      const next = snapshot(newSettings);
      setSettings(next);
      props.storage.store(next).catch(catchError);
    },
  };
  return <SettingsContext.Provider value={value}>{props.children}</SettingsContext.Provider>;
}
