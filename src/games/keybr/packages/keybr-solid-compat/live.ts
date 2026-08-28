import { type Accessor, untrack } from "solid-js";

export const LIVE_ACCESSOR = Symbol("keybr.liveAccessor");

/**
 * Stable object identity backed by a Solid accessor. This is useful while porting
 * React contexts whose consumers destructure a value once but expect later reads
 * from that object to observe the latest provider state.
 */
export function liveObject<T extends object>(read: Accessor<T>): T {
  const target = untrack(read);
  return new Proxy(target, {
    get(_target, key) {
      if (key === LIVE_ACCESSOR) return read;
      const current = read();
      const value = Reflect.get(current, key, current);
      return typeof value === "function" ? value.bind(current) : value;
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
