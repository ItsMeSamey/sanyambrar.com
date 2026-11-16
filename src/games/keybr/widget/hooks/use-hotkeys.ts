import { useWindowEvent } from "./use-window-event.ts";
type HotkeyMap = Record<string, Handler>;
type Handler = (event: KeyEvent) => void;
type HotkeyOptions = {
    readonly ignoreInteractive?: boolean;
    readonly ignoreModal?: boolean;
    readonly enabled?: () => boolean;
};
type KeyEvent = {
    readonly target?: EventTarget | null;
    readonly defaultPrevented?: boolean;
    readonly isComposing?: boolean;
    readonly key: string;
    readonly code: string;
    readonly altKey: boolean;
    readonly ctrlKey: boolean;
    readonly metaKey: boolean;
    readonly shiftKey: boolean;
    preventDefault(): void;
    stopPropagation(): void;
};
type Hotkey = {
    readonly alt: boolean;
    readonly ctrl: boolean;
    readonly meta: boolean;
    readonly shift: boolean;
    readonly key: string;
};
export const useHotkeys = (map: HotkeyMap, options: HotkeyOptions = {}): void => {
    useWindowEvent("keydown", useHotkeysHandler(map, options));
};
export const useHotkeysHandler = (map: HotkeyMap, options: HotkeyOptions = {}) => {
    const hotkeys = parseHotkeyMap(map);
    return (event: KeyEvent): void => {
        if (event.defaultPrevented || event.isComposing || options.enabled?.() === false) return;
        if (options.ignoreModal && document.querySelector('[role="dialog"][aria-modal="true"]')) return;
        if (options.ignoreInteractive && event.target instanceof Element && event.target.closest(
            'button, a[href], input, select, textarea, summary, [contenteditable]:not([contenteditable="false"]), [tabindex], [role="button"], [role="menuitem"]',
        )) return;
        for (const [hotkey, handler] of hotkeys) {
            if ((event.key === hotkey.key || event.code === hotkey.key) &&
                event.altKey === hotkey.alt && event.ctrlKey === hotkey.ctrl &&
                event.metaKey === hotkey.meta && event.shiftKey === hotkey.shift) {
                event.preventDefault();
                event.stopPropagation();
                handler(event);
            }
        }
    };
};
const parseHotkeyMap = (map: HotkeyMap): [
    Hotkey,
    Handler
][] => {
    return Object.entries(map) //
        .map(([spec, handler]) => [parseHotkey(spec), handler]);
};
const hotkeyCache = new Map<string, Hotkey>();
const parseHotkey = (spec: string): Hotkey => {
    let hotkey = hotkeyCache.get(spec);
    if (hotkey == null) {
        const error = () => {
            throw new TypeError(import.meta.env.MODE !== "production"
                ? `Invalid hotkey [${spec}]`
                : undefined);
        };
        const parsed = {
            alt: false,
            ctrl: false,
            meta: false,
            shift: false,
            key: "",
        };
        const keys = spec.split("+");
        while (keys.length > 0) {
            const key = keys.shift()!;
            switch (key) {
                case "Alt":
                    if (parsed.alt) {
                        error();
                    }
                    else {
                        parsed.alt = true;
                    }
                    break;
                case "Ctrl":
                    if (parsed.ctrl) {
                        error();
                    }
                    else {
                        parsed.ctrl = true;
                    }
                    break;
                case "Meta":
                    if (parsed.meta) {
                        error();
                    }
                    else {
                        parsed.meta = true;
                    }
                    break;
                case "Shift":
                    if (parsed.shift) {
                        error();
                    }
                    else {
                        parsed.shift = true;
                    }
                    break;
                default:
                    if (keys.length === 0) {
                        parsed.key = key;
                    }
                    else {
                        error();
                    }
                    break;
            }
        }
        if (parsed.key === "") {
            error();
        }
        hotkeyCache.set(spec, (hotkey = parsed));
    }
    return hotkey;
};
