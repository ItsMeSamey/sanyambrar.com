import { Canvas, Rect, type ShapeList, Shapes, type Size } from "@keybr/widget";
import { type ReactNode } from "@keybr/solid-compat/react";
import { type ChartStyles } from "./use-chart-styles.ts";
export type SizeProps = {
    readonly width: string;
    readonly height: string;
};
export function Chart(solidProps: {
    readonly children: ReactNode;
} & SizeProps): ReactNode {
    return (<div style={{
            display: "block",
            position: "relative",
            "inset-inline-start": "0px",
            "inset-block-start": "0px",
            "inline-size": solidProps.width,
            "block-size": solidProps.height,
            margin: "0px",
            padding: "0px",
            "border-style": "none",
        }}>
      {solidProps.children}
    </div>);
}
export function ChartCanvas(solidProps: {
    readonly styles: ChartStyles;
    readonly paint: (rect: Rect) => ShapeList;
} & SizeProps): ReactNode {
    return (<Chart width={solidProps.width} height={solidProps.height}>
      <Canvas paint={chartArea(solidProps.styles, solidProps.paint)}/>
    </Chart>);
}
export function chartArea(styles: ChartStyles, cb: (d: Rect) => ShapeList) {
    return ({ width, height }: Size) => {
        const h = styles.lineHeight * 5;
        const v = styles.lineHeight * 2;
        const area = new Rect(h, v, width - h * 2, height - v * 2).round();
        return [Shapes.clear(), cb(area)];
    };
}
