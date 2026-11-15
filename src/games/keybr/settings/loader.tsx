import { catchError } from "../debug/logger.ts";
import { createMemo, Loading, Show } from "solid-js";
import { type JSX } from "@solidjs/web";
import { Alert } from "../widget/components/toast/Alert.tsx";
import { toast } from "../widget/components/toast/Toaster.tsx";
import { SettingsContext } from "./context.ts";
import { Settings, type SettingsStorage } from "./settings.ts";
import { createSettingsState } from "./state.ts";
import { createLocalSettingsStorage, type SettingsStorageFailure } from "./storage.ts";

function reportStorageFailure({ operation, error }: SettingsStorageFailure) {
  console.warn(`Could not ${operation} Keybr settings`, error);
  toast(() => <Alert severity="error" closeButton>
    <p role="status">{operation === "read"
      ? "Saved settings could not be read. Temporary defaults are in use; your saved settings have not been replaced."
      : "Settings could not be saved. Your changes still work for this visit."}</p>
    <p>Allow site storage and reload to try again.</p>
  </Alert>, { autoClose: false, pauseOnHover: false, closeOnClick: false });
}

export function SettingsLoader(props: { readonly children: JSX.Element; readonly fallback?: JSX.Element }) {
  const storage = createMemo<SettingsStorage>(() => createLocalSettingsStorage(reportStorageFailure));
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
