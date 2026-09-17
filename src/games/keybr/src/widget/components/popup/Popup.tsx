import type { JSX } from "@solidjs/web";
import { place } from "../../floating/fluent.ts";
import { type FloatingPosition } from "../../floating/types.ts";
import { useScreenSize } from "../../hooks/use-screen-size.ts";
import { getBoundingBox } from "../../utils/geometry.ts";
import { querySelector } from "../../utils/query.ts";
import { type MouseProps } from "../types.ts";
import * as styles from "./Popup.module.css";
import { createEffect, createMemo, omit, merge } from 'solid-js';
export type PopupProps = {
    readonly anchor?: Element | string;
    readonly arrow?: boolean;
    readonly children?: JSX.Element;
    readonly position?: FloatingPosition;
    readonly offset?: number;
} & MouseProps;
export function Popup(allProps: PopupProps): JSX.Element {
    const mergedProps = merge(allProps, { get arrow() { return allProps.arrow ?? true; }, get offset() { return allProps.offset ?? 20; } });
    const local = mergedProps, props = omit(mergedProps, "anchor", "arrow", "children", "position", "offset");
    let root!: HTMLDivElement;
    let arrow: HTMLDivElement | undefined;
    const options = createMemo(() => ({ position: local.position, offset: local.offset }));
    const screenSize = useScreenSize();
    createEffect(() => ({ anchor: local.anchor, options: options(), screenSize: screenSize() }), ({ anchor, options, screenSize }) => {
        if (anchor == null) {
            place(root).centerToScreen(screenSize);
        } else {
            const anchorBox = getBoundingBox(querySelector(anchor));
            place(root, arrow).withOptions(options).alignToAnchor(anchorBox, screenSize);
        }
    });
    return (<div {...props} ref={el => root = el} data-samey-overlay="" class={styles.root} style={{ position: "fixed", "z-index": 1 }}>
      {local.anchor && local.arrow && (<div ref={el => arrow = el} class={styles.arrow} style={{ position: "absolute" }}/>)}
      {local.children}
    </div>);
}
