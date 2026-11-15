import { errorMessage, errorWithCause } from "../../../shared/error.ts";
import { Settings, type SettingsStorage } from "./settings.ts";

export type SettingsStorageFailure = { operation: "read" | "write"; error: unknown };

export function createLocalSettingsStorage(
  onFailure: (failure: SettingsStorageFailure) => void,
  getStorage: () => Pick<Storage, "getItem" | "setItem"> = () => localStorage,
): SettingsStorage {
  const key = "settings";
  let canWrite = false;
  let failureReported = false;
  const report = (operation: SettingsStorageFailure["operation"], error: unknown) => {
    if (failureReported) return;
    failureReported = true;
    onFailure({ operation, error });
  };
  const store = (settings: Settings) => {
    if (!canWrite) return settings;
    try {
      getStorage().setItem(key, JSON.stringify(settings.toJSON()));
      failureReported = false;
    } catch (error) {
      report("write", error);
    }
    return settings;
  };
  return {
    async load() {
      let value: string | null;
      try {
        value = getStorage().getItem(key);
      } catch (error) {
        // An unreadable saved value may still exist. Keep this visit in memory
        // so changing a default cannot replace settings we never recovered.
        canWrite = false;
        report("read", error);
        return new Settings(undefined, true);
      }
      if (value != null) {
        try {
          const settings = new Settings(JSON.parse(value));
          canWrite = true;
          return settings;
        } catch (error) {
          throw errorWithCause(`Keybr settings are invalid: ${errorMessage(error)}`, error);
        }
      }
      canWrite = true;
      return store(new Settings(undefined, true));
    },
    async store(settings) { return store(settings); },
  };
}
