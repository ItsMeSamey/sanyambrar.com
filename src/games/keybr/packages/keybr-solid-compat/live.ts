import { type Accessor, untrack } from "solid-js";

export const LIVE_ACCESSOR = Symbol("keybr.liveAccessor");

/**
 * Stable object identity backed by a Solid accessor. Property reads always use
 * the latest object. Function properties use stable forwarding wrappers so a
 * destructured method still calls the latest backing object.
 */
export function liveObject<T extends object>(read: Accessor<T>): T {
  const target = untrack(read);
  const methodCache = new Map<PropertyKey, (...args: unknown[]) => unknown>();
  return new Proxy(target, {
    get(_target, key) {
      if (key === LIVE_ACCESSOR) return read;
      const current = read();
      const value = Reflect.get(current, key, current);
      if (typeof value !== "function") return value;
      let forward = methodCache.get(key);
      if (forward == null) {
        forward = (...args: unknown[]) => {
          const latest = read();
          const fn = Reflect.get(latest, key, latest);
          if (typeof fn !== "function") {
            throw new TypeError(`Live property [${String(key)}] is no longer callable`);
          }
          return Reflect.apply(fn, latest, args);
        };
        methodCache.set(key, forward);
      }
      return forward;
    },
    has(_target, key) { return Reflect.has(read(), key); },
    ownKeys() { return Reflect.ownKeys(read()); },
    getOwnPropertyDescriptor(_target, key) {
      const descriptor = Reflect.getOwnPropertyDescriptor(read(), key);
      return descriptor == null ? undefined : { ...descriptor, configurable: true };
    },
  }) as T;
}

export function liveArray<T>(read: Accessor<readonly T[]>): readonly T[] {
  return liveObject(read);
}

export function touchLive(value: object): void {
  const read = Reflect.get(value, LIVE_ACCESSOR);
  if (typeof read === "function") read();
}
