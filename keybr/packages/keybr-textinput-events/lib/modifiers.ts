import { type ModifierId } from "./types.ts";

const all = [
  "CapsLock",
  "NumLock",
  "Control",
  "Shift",
  "Alt",
  "AltGraph",
  "Meta",
] satisfies ModifierId[];

type ModifierTracker = {
  initialized: boolean;
  modifiers: readonly ModifierId[];
};

declare global {
  var SameyKeybrModifierTracker: ModifierTracker | undefined;
}

const tracker = (globalThis.SameyKeybrModifierTracker ??= {
  initialized: false,
  modifiers: [],
});

/**
 * A static global object which tracks the state of the modifier keys,
 * such as `CapsLock`, `NumLock`, etc.
 */
export class ModifierState {
  static get modifiers(): readonly ModifierId[] {
    return tracker.modifiers;
  }

  static get capsLock(): boolean {
    return tracker.modifiers.includes("CapsLock");
  }

  static get numLock(): boolean {
    return tracker.modifiers.includes("NumLock");
  }

  static initialize() {
    if (!tracker.initialized) {
      // The Keybr bundle can be mounted repeatedly by the shared page runtime.
      // Keep exactly one pair of global listeners across those mounts.
      window.addEventListener("keydown", (event) => {
        tracker.modifiers = getModifiers(event);
      });
      window.addEventListener("keyup", (event) => {
        tracker.modifiers = getModifiers(event);
      });
      tracker.initialized = true;
    }
  }
}

export function getModifiers(event: KeyboardEvent): ModifierId[] {
  return all.filter((id) => event.getModifierState(id));
}

export function isTextInput(modifiers: readonly ModifierId[]): boolean {
  return !(
    modifiers.includes("Control") ||
    modifiers.includes("Alt") ||
    modifiers.includes("Meta")
  );
}
