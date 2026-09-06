import { type ReactNode, useLayoutEffect, useMemo, useRef } from "@keybr/solid-compat/react";
import { type FloatingPosition, place } from "../../floating/index.ts";
import { useScreenSize } from "../../hooks/index.ts";
import { getBoundingBox, querySelector } from "../../utils/index.ts";
import { type MouseProps } from "../types.ts";
import * as styles from "./Popup.module.css";
import { omit, merge } from 'solid-js';
export type PopupProps = {
    readonly anchor?: Element | string;
    readonly arrow?: boolean;
    readonly children?: ReactNode;
    readonly position?: FloatingPosition;
    readonly offset?: number;
} & MouseProps;
export function Popup(solidAllProps: PopupProps): ReactNode {
    const solidMergedProps = merge(solidAllProps, { get arrow() { return solidAllProps.arrow ?? true; }, get offset() { return solidAllProps.offset ?? 20; } });
    const solidLocal = solidMergedProps, props = omit(solidMergedProps, "anchor", "arrow", "children", "position", "offset");
    const rootRef = useRef<HTMLDivElement>(null);
    const arrowRef = useRef<HTMLDivElement>(null);
    const options = useMemo(() => ({ position: solidLocal.position, offset: solidLocal.offset }), () => [solidLocal.position, solidLocal.offset]);
    const screenSize = useScreenSize();
    useLayoutEffect(() => {
        if (rootRef.current != null)
            if (solidLocal.anchor == null) {
                place(rootRef.current!).centerToScreen(screenSize);
            }
            else {
                const anchorBox = getBoundingBox(querySelector(solidLocal.anchor));
                place(rootRef.current!, arrowRef.current!)
                    .withOptions(options)
                    .alignToAnchor(anchorBox, screenSize);
            }
    }, () => [solidLocal.anchor, options, screenSize]);
    return (<div {...props} ref={el => rootRef.current = el} data-samey-overlay="" class={styles.root} style={{ position: "fixed", "z-index": 1 }}>
      {solidLocal.anchor && solidLocal.arrow && (<div ref={el => arrowRef.current = el} class={styles.arrow} style={{ position: "absolute" }}/>)}
      {solidLocal.children}
    </div>);
}
