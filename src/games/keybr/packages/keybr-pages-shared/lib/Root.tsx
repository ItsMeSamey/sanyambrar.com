import { type ReactNode } from "@keybr/solid-compat/react";
export function Root(solidProps: {
    readonly children?: ReactNode;
}): ReactNode {
    return <div id="keybr-root">{solidProps.children}</div>;
}
Root.selector = "#keybr-root";
