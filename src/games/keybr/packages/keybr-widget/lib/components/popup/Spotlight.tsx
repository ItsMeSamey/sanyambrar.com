import { type ReactNode, useLayoutEffect, useRef } from "@keybr/solid-compat/react";
import { placeElement } from "../../floating/index.ts";
import { useScreenSize } from "../../hooks/index.ts";
import { getBoundingBox } from "../../utils/geometry.ts";
import { querySelector } from "../../utils/query.ts";
import * as styles from "./Spotlight.module.css";
export type SpotlightProps = {
    readonly anchor?: Element | string;
    readonly margin?: number;
};
export function Spotlight(solidProps: SpotlightProps): ReactNode {
    const c1Ref = useRef<HTMLDivElement>(null);
    const c2Ref = useRef<HTMLDivElement>(null);
    const c3Ref = useRef<HTMLDivElement>(null);
    const c4Ref = useRef<HTMLDivElement>(null);
    const markerRef = useRef<HTMLDivElement>(null);
    const screenSize = useScreenSize();
    useLayoutEffect(() => {
        const c1 = c1Ref.current;
        const c2 = c2Ref.current;
        const c3 = c3Ref.current;
        const c4 = c4Ref.current;
        const marker = markerRef.current;
        if (solidProps.anchor != null &&
            c1 != null &&
            c2 != null &&
            c3 != null &&
            c4 != null &&
            marker != null) {
            const anchorBox = getBoundingBox(querySelector(solidProps.anchor));
            const x = anchorBox.x - (solidProps.margin === undefined ? 10 : solidProps.margin);
            const y = anchorBox.y - (solidProps.margin === undefined ? 10 : solidProps.margin);
            const w = anchorBox.width + (solidProps.margin === undefined ? 10 : solidProps.margin) * 2;
            const h = anchorBox.height + (solidProps.margin === undefined ? 10 : solidProps.margin) * 2;
            placeElement(c1, { left: 0, top: 0, width: x + w, height: y });
            placeElement(c2, { left: x + w, top: 0, right: 0, height: y + h });
            placeElement(c3, { left: x, top: y + h, right: 0, bottom: 0 });
            placeElement(c4, { left: 0, top: y, width: x, bottom: 0 });
            placeElement(marker, { left: x, top: y, width: w, height: h });
        }
    }, () => [solidProps.anchor, (solidProps.margin === undefined ? 10 : solidProps.margin), screenSize]);
    return (<div class={styles.root}>
      {solidProps.anchor && (<>
          <div ref={el => c1Ref.current = el} class={styles.c1}/>
          <div ref={el => c2Ref.current = el} class={styles.c2}/>
          <div ref={el => c3Ref.current = el} class={styles.c3}/>
          <div ref={el => c4Ref.current = el} class={styles.c4}/>
          <div ref={el => markerRef.current = el} class={styles.marker}/>
        </>)}
    </div>);
}
