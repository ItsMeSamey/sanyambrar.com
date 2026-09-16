import type { JSX } from "@solidjs/web";
import { type FloatingPosition, place } from "../../floating/index.ts";
import { useScreenSize } from "../../hooks/index.ts";
import { getBoundingBox, querySelector } from "../../utils/index.ts";
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
export function Popup(solidAllProps: PopupProps): JSX.Element {
    const solidMergedProps = merge(solidAllProps, { get arrow() { return solidAllProps.arrow ?? true; }, get offset() { return solidAllProps.offset ?? 20; } });
    const solidLocal = solidMergedProps, props = omit(solidMergedProps, "anchor", "arrow", "children", "position", "offset");
    let root!: HTMLDivElement;
    let arrow: HTMLDivElement | undefined;
    const options = createMemo(() => ({ position: solidLocal.position, offset: solidLocal.offset }));
    const screenSize = useScreenSize();
    createEffect(() => ({ anchor: solidLocal.anchor, options: options(), screenSize: screenSize() }), ({ anchor, options, screenSize }) => {
        if (anchor == null) {
            place(root).centerToScreen(screenSize);
        } else {
            const anchorBox = getBoundingBox(querySelector(anchor));
            place(root, arrow).withOptions(options).alignToAnchor(anchorBox, screenSize);
        }
    });
    return (<div {...props} ref={el => root = el} data-samey-overlay="" class={styles.root} style={{ position: "fixed", "z-index": 1 }}>
      {solidLocal.anchor && solidLocal.arrow && (<div ref={el => arrow = el} class={styles.arrow} style={{ position: "absolute" }}/>)}
      {solidLocal.children}
    </div>);
}
