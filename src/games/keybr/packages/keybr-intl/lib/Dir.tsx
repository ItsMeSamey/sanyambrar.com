import { type ReactElement, type ReactNode } from "@keybr/solid-compat/react";

/**
 * Compatibility wrapper retained for ports that still import Dir.
 * The active call sites perform their direction-aware icon selection before
 * rendering because Solid JSX does not expose mutable React vnode props.
 */
export function Dir(solidProps: {
    readonly children: readonly [ReactElement, ReactElement];
    readonly swap: string;
}): ReactNode {
    return solidProps.children as unknown as ReactNode;
}
