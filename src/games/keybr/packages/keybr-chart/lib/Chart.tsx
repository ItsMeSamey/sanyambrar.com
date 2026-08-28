import { Canvas, Rect, type ShapeList, Shapes, type Size } from "@keybr/widget";
import { type ReactNode } from "@keybr/solid-compat/react";
import { type ChartStyles } from "./use-chart-styles.ts";
export type SizeProps = {
    readonly width: string;
    readonly height: string;
};
export function Chart({ children, width, height, }: {
    readonly children: ReactNode;
} & SizeProps): ReactNode {
    return (<div style={{
            display: "block",
            position: "relative",
            "inset-inline-start": "0px",
            "inset-block-start": "0px",
            "inline-size": width,
            "block-size": height,
            margin: "0px",
            padding: "0px",
            "border-style": "none",
        }}>
      {children}
    </div>);
}
export function ChartCanvas({ styles, paint, width, height, }: {
    readonly styles: ChartStyles;
    readonly paint: (rect: Rect) => ShapeList;
} & SizeProps): ReactNode {
    return (<Chart width={width} height={height}>
      <Canvas paint={chartArea(styles, paint)}/>
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
