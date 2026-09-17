import { type Keyboard } from "../keyboard/keyboard.ts";
import { type KeyId } from "../keyboard/types.ts";
import { type Settings } from "../settings/settings.ts";
import { useWindowEvent } from "../widget/hooks/use-window-event.ts";
import { type Accessor, createMemo, createSignal } from 'solid-js';

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
export function useDepressedKeys(settings: Settings, keyboard: Keyboard): Accessor<readonly KeyId[]> {
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
    return depressedKeys;
}
