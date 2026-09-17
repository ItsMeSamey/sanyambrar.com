import type { JSX } from "@solidjs/web";
import { Canvas } from "../widget/components/canvas/Canvas.tsx";
import { Rect } from "../widget/utils/rect.ts";
import { type ShapeList, Shapes } from "../widget/components/canvas/graphics.ts";
import { type Size } from "../widget/utils/size.ts";

import { type ChartStyles } from "./use-chart-styles.ts";
export type SizeProps = {
    readonly width: string;
    readonly height: string;
};
export function Chart(props: {
    readonly children: JSX.Element;
} & SizeProps): JSX.Element {
    return (<div style={{
            display: "block",
            position: "relative",
            "inset-inline-start": "0px",
            "inset-block-start": "0px",
            "inline-size": props.width,
            "block-size": props.height,
            margin: "0px",
            padding: "0px",
            "border-style": "none",
        }}>
      {props.children}
    </div>);
}
export function ChartCanvas(props: {
    readonly styles: ChartStyles;
    readonly paint: (rect: Rect) => ShapeList;
} & SizeProps): JSX.Element {
    return (<Chart width={props.width} height={props.height}>
      <Canvas paint={chartArea(props.styles, props.paint)}/>
    </Chart>);
}
function chartArea(styles: ChartStyles, cb: (d: Rect) => ShapeList) {
    return ({ width, height }: Size) => {
        const h = styles.lineHeight * 5;
        const v = styles.lineHeight * 2;
        const area = new Rect(h, v, width - h * 2, height - v * 2).round();
        return [Shapes.clear(), cb(area)];
    };
}
