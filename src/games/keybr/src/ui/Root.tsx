import type { JSX } from "@solidjs/web";
export function Root(props: {
    readonly children?: JSX.Element;
}): JSX.Element {
    return <div id="keybr-root">{props.children}</div>;
}
Root.selector = "#keybr-root";
