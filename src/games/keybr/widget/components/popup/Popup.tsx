import type { JSX } from "@solidjs/web";
import { place } from "../../floating/fluent.ts";
import { type FloatingPosition } from "../../floating/types.ts";
import { useElementSize } from "../../hooks/use-element-size.ts";
import { useScreenSize } from "../../hooks/use-screen-size.ts";
import { getBoundingBox } from "../../utils/geometry.ts";
import { querySelector } from "../../utils/query.ts";
import { type MouseProps } from "../types.ts";
import styles from "./Popup.module.css";
import { createEffect, createMemo, createSignal, omit, merge } from 'solid-js';
 type PopupProps = {
    readonly anchor?: Element | string;
    readonly arrow?: boolean;
    readonly children?: JSX.Element;
    readonly position?: FloatingPosition;
    readonly offset?: number;
} & MouseProps;
export function Popup(allProps: PopupProps): JSX.Element {
    const mergedProps = merge(allProps, { get arrow() { return allProps.arrow ?? true; }, get offset() { return allProps.offset ?? 20; } });
    const local = mergedProps, props = omit(mergedProps, "anchor", "arrow", "children", "position", "offset");
    const [root, setRoot] = createSignal<HTMLDivElement>();
    let arrow: HTMLDivElement | undefined;
    const options = createMemo(() => ({ position: local.position, offset: local.offset }));
    const screenSize = useScreenSize();
    const popupSize = useElementSize(root);
    createEffect(() => ({ anchor: local.anchor, options: options(), screenSize: screenSize(), popupSize: popupSize() }), ({ anchor, options, screenSize, popupSize }) => {
        const currentRoot = root();
        if (currentRoot == null || popupSize == null) return;
        if (anchor == null) {
            place(currentRoot).centerToScreen(screenSize);
        } else {
            const anchorBox = getBoundingBox(querySelector(anchor));
            place(currentRoot, arrow).withOptions(options).alignToAnchor(anchorBox, screenSize);
        }
    });
    return (<div {...props} ref={setRoot} data-samey-overlay="" class={styles.root} style={{ position: "fixed", "z-index": 1 }}>
      {local.anchor && local.arrow && (<div ref={el => arrow = el} class={styles.arrow} style={{ position: "absolute" }}/>)}
      {local.children}
    </div>);
}
