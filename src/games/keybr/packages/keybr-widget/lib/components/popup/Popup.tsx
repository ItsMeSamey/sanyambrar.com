import { type ReactNode, useLayoutEffect, useMemo, useRef } from "@keybr/solid-compat/react";
import { type FloatingPosition, place } from "../../floating/index.ts";
import { useScreenSize } from "../../hooks/index.ts";
import { getBoundingBox, querySelector } from "../../utils/index.ts";
import { type MouseProps } from "../types.ts";
import * as styles from "./Popup.module.css";
export type PopupProps = {
    readonly anchor?: Element | string;
    readonly arrow?: boolean;
    readonly children?: ReactNode;
    readonly position?: FloatingPosition;
    readonly offset?: number;
} & MouseProps;
export function Popup({ anchor, arrow = true, children, position, offset = 20, ...props }: PopupProps): ReactNode {
    const rootRef = useRef<HTMLDivElement>(null);
    const arrowRef = useRef<HTMLDivElement>(null);
    const options = useMemo(() => ({ position, offset }), () => [position, offset]);
    const screenSize = useScreenSize();
    useLayoutEffect(() => {
        if (rootRef.current != null)
            if (anchor == null) {
                place(rootRef.current!).centerToScreen(screenSize);
            }
            else {
                const anchorBox = getBoundingBox(querySelector(anchor));
                place(rootRef.current!, arrowRef.current!)
                    .withOptions(options)
                    .alignToAnchor(anchorBox, screenSize);
            }
    }, () => [anchor, options, screenSize]);
    return (<div {...props} ref={el => rootRef.current = el} class={styles.root} style={{ position: "fixed", "z-index": 1 }}>
      {anchor && arrow && (<div ref={el => arrowRef.current = el} class={styles.arrow} style={{ position: "absolute" }}/>)}
      {children}
    </div>);
}
