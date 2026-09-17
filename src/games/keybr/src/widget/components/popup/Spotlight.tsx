import type { JSX } from "@solidjs/web";
import { createEffect } from "solid-js";
import { placeElement } from "../../floating/place.ts";
import { useScreenSize } from "../../hooks/use-screen-size.ts";
import { getBoundingBox } from "../../utils/geometry.ts";
import { querySelector } from "../../utils/query.ts";
import * as styles from "./Spotlight.module.css";
export type SpotlightProps = {
    readonly anchor?: Element | string;
    readonly margin?: number;
};
export function Spotlight(props: SpotlightProps): JSX.Element {
    let c1!: HTMLDivElement;
    let c2!: HTMLDivElement;
    let c3!: HTMLDivElement;
    let c4!: HTMLDivElement;
    let marker!: HTMLDivElement;
    const screenSize = useScreenSize();
    createEffect(() => ({ anchor: props.anchor, margin: props.margin ?? 10, screenSize: screenSize() }), ({ anchor, margin }) => {
        if (anchor == null) return;
        const anchorBox = getBoundingBox(querySelector(anchor));
        const x = anchorBox.x - margin;
        const y = anchorBox.y - margin;
        const w = anchorBox.width + margin * 2;
        const h = anchorBox.height + margin * 2;
        placeElement(c1, { left: 0, top: 0, width: x + w, height: y });
        placeElement(c2, { left: x + w, top: 0, right: 0, height: y + h });
        placeElement(c3, { left: x, top: y + h, right: 0, bottom: 0 });
        placeElement(c4, { left: 0, top: y, width: x, bottom: 0 });
        placeElement(marker, { left: x, top: y, width: w, height: h });
    });
    return (<div class={styles.root}>
      {props.anchor && (<>
          <div ref={el => c1 = el} class={styles.c1}/>
          <div ref={el => c2 = el} class={styles.c2}/>
          <div ref={el => c3 = el} class={styles.c3}/>
          <div ref={el => c4 = el} class={styles.c4}/>
          <div ref={el => marker = el} class={styles.marker}/>
        </>)}
    </div>);
}
