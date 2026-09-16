import type { JSX } from "@solidjs/web";
export function Root(solidProps: {
    readonly children?: JSX.Element;
}): JSX.Element {
    return <div id="keybr-root">{solidProps.children}</div>;
}
Root.selector = "#keybr-root";
