import { catchError } from "@keybr/debug";
import { type Settings, SettingsContext, type SettingsStorage } from "@keybr/settings";
import { liveObject } from "@keybr/solid-compat/live";
import { createSignal, type JSX } from "solid-js";

export function SettingsProvider(props: {
  readonly storage: SettingsStorage;
  readonly initialSettings: Settings;
  readonly children: JSX.Element;
}) {
  const [settings, setSettings] = createSignal(props.initialSettings, { equals: false });
  const liveSettings = liveObject(settings);
  const value = {
    settings: liveSettings,
    updateSettings(newSettings: Settings) {
      setSettings(newSettings);
      props.storage.store(newSettings).catch(catchError);
    },
  };
  return <SettingsContext.Provider value={value}>{props.children}</SettingsContext.Provider>;
}
