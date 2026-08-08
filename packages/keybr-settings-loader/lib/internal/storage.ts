import { Settings, type SettingsStorage } from "@keybr/settings";
import { ObjectStorage } from "./objectstore.ts";

export const STORAGE_KEY = "settings";

export function openSettingsStorage(): SettingsStorage {
  const storage = new ObjectStorage();
  return new (class implements SettingsStorage {
    async load(): Promise<Settings> {
      const value = storage.get(STORAGE_KEY);
      if (value != null) {
        return new Settings(value as any);
      }
      const settings = new Settings(undefined, true);
      storage.set(STORAGE_KEY, settings.toJSON());
      return settings;
    }

    async store(settings: Settings): Promise<Settings> {
      storage.set(STORAGE_KEY, settings.toJSON());
      return settings;
    }
  })();
}
