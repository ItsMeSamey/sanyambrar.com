import { Settings, type SettingsStorage } from "@keybr/settings";
import { catchError } from "@keybr/debug";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { SettingsProvider } from "./internal/SettingsProvider.tsx";

export function SettingsLoader({
  children,
  fallback = null,
}: {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}): ReactNode {
  const storage = useSettingsStorage();
  const settings = useLoader(storage);
  if (settings == null) {
    return fallback;
  }
  return (
    <SettingsProvider storage={storage} initialSettings={settings}>
      {children}
    </SettingsProvider>
  );
}

function useSettingsStorage(): SettingsStorage {
  return useMemo(() => {
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
      async store(settings) { localStorage.setItem(key, JSON.stringify(settings.toJSON())); return settings; },
    };
  }, []);
}

function useLoader(storage: SettingsStorage): Settings | null {
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => {
    let cancelled = false;
    storage.load().then((value) => { if (!cancelled) setSettings(value); }).catch(catchError);
    return () => { cancelled = true; };
  }, [storage]);
  return settings;
}
