import { createSignal, type Accessor, untrack } from "solid-js";
import { type AnyProp } from "./props.ts";
import { Settings } from "./settings.ts";

/**
 * Stable Settings identity with property-level Solid dependencies.
 *
 * The previous React compatibility proxy subscribed every `settings.get(...)`
 * call to one global Settings signal. Any setting change therefore invalidated
 * every reactive consumer on the page. This facade tracks each setting key
 * independently while still returning immutable Settings snapshots from `set`.
 */
export function createReactiveSettings(initial: Settings): {
  readonly settings: Settings;
  readonly current: Accessor<Settings>;
  readonly replace: (next: Settings) => void;
} {
  const [current, setCurrent] = createSignal(initial, { equals: false });
  const revisions = new Map<string, ReturnType<typeof createSignal<number>>>();
  const [isNewRevision, setIsNewRevision] = createSignal(0);

  const revision = (key: string) => {
    let signal = revisions.get(key);
    if (signal == null) {
      signal = createSignal(0);
      revisions.set(key, signal);
    }
    return signal;
  };

  const get = <T>(prop: AnyProp<T>, defaultValue?: T): T => {
    revision(prop.key)[0]();
    return untrack(current).get(prop, defaultValue);
  };
  const set = <T>(prop: AnyProp<T>, value: T): Settings =>
    untrack(current).set(prop, value);
  const reset = (): Settings => untrack(current).reset();
  const toJSON = () => untrack(current).toJSON();

  const settings = new Proxy(initial, {
    get(_target, key) {
      switch (key) {
        case "get": return get;
        case "set": return set;
        case "reset": return reset;
        case "toJSON": return toJSON;
        case "isNew":
          isNewRevision();
          return untrack(current).isNew;
        default: {
          const value = Reflect.get(untrack(current), key, untrack(current));
          return typeof value === "function" ? value.bind(untrack(current)) : value;
        }
      }
    },
  }) as Settings;

  const replace = (next: Settings) => {
    const previous = untrack(current);
    const before = previous.toJSON();
    const after = next.toJSON();
    setCurrent(next);

    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      if (!Object.is(before[key], after[key])) {
        const signal = revisions.get(key);
        if (signal != null) signal[1]((value) => value + 1);
      }
    }
    if (previous.isNew !== next.isNew) {
      setIsNewRevision((value) => value + 1);
    }
  };

  return { settings, current, replace };
}
