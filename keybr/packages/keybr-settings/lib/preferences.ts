import { type AnyProp } from "./props.ts";

export class Preferences {
  static get<T>(prop: AnyProp<T>): T {
    return prop.fromJson(getItem(prop.key));
  }

  static set<T>(prop: AnyProp<T>, value: T): void {
    setItem(prop.key, prop.toJson(value));
  }
}

function getItem(key: string): unknown {
  if (typeof window !== "object") return null;
  try {
    const item = window.localStorage.getItem(key);
    if (item == null) return null;
    try {
      return JSON.parse(item);
    } catch {
      window.localStorage.removeItem(key);
    }
  } catch {}
  return null;
}

function setItem(key: string, value: unknown): void {
  if (typeof window !== "object") return;
  try {
    if (value != null) window.localStorage.setItem(key, JSON.stringify(value));
    else window.localStorage.removeItem(key);
  } catch {}
}
