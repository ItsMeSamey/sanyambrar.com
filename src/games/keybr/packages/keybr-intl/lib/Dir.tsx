import { type ReactElement, type ReactNode } from "@keybr/solid-compat/react";

/**
 * Compatibility wrapper retained for ports that still import Dir.
 * The active call sites perform their direction-aware icon selection before
 * rendering because Solid JSX does not expose mutable React vnode props.
 */
export function Dir({ children }: {
    readonly children: readonly [ReactElement<any>, ReactElement<any>];
    readonly swap: string;
}): ReactNode {
    return children as unknown as ReactNode;
}
