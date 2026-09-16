import { type Keyboard, type KeyId } from "@keybr/keyboard";
import { type Settings } from "@keybr/settings";
import { useWindowEvent } from "@keybr/widget";
import { liveArray } from "@keybr/solid-compat/live";
import { createMemo, createSignal } from 'solid-js';

import { emulateLayout } from "./emulation.ts";
import { mapEvent } from "./events.ts";
export function addKey(keys: readonly KeyId[], key: KeyId): KeyId[] {
    const set = new Set(keys);
    set.add(key);
    return [...set];
}
export function deleteKey(keys: readonly KeyId[], key: KeyId): KeyId[] {
    const set = new Set(keys);
    set.delete(key);
    return [...set];
}
export function useDepressedKeys(settings: Settings, keyboard: Keyboard): readonly KeyId[] {
    const [depressedKeys, setDepressedKeys] = createSignal<KeyId[]>([]);
    const listener = createMemo(() => emulateLayout(settings, keyboard, {
        onKeyDown: ({ code }) => setDepressedKeys(addKey(depressedKeys(), code)),
        onKeyUp: ({ code }) => setDepressedKeys(deleteKey(depressedKeys(), code)),
        onInput: () => { },
    }));
    useWindowEvent("keydown", (event) => {
        listener().onKeyDown(mapEvent(event));
    });
    useWindowEvent("keyup", (event) => {
        listener().onKeyUp(mapEvent(event));
    });
    return liveArray(depressedKeys);
}
