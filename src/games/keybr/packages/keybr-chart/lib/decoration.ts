import { type Range } from "@keybr/math";
import { type GraphicsStyle, type Rect, type ShapeList, Shapes, } from "@keybr/widget";
import { type MessageDescriptor } from "@keybr/solid-compat/intl";
import { hBoxes, hTicks, vBoxes, vTicks } from "./geometry.ts";
import { type ChartStyles } from "./use-chart-styles.ts";
export type Edge = "left" | "right" | "top" | "bottom";
export function withStyles(styles: ChartStyles) {
    const stroke = (style: GraphicsStyle, width: number, lines: ShapeList): ShapeList =>
        Shapes.stroke({ ...style, lineWidth: width, lineCap: "round", lineJoin: "round" }, lines);
    function paintGrid(box: Rect, direction: "vertical" | "horizontal", { lines = 3, style = styles.frame, }: {
        readonly lines?: number;
        readonly style?: GraphicsStyle;
    } = {}): ShapeList {
        switch (direction) {
            case "vertical":
                return stroke(style, 1, vTicks(box, makeRange(0, lines)).map(({ point }) => Shapes.line({
                    x1: point.x,
                    y1: point.y,
                    x2: point.x,
                    y2: point.y + box.height,
                })));
            case "horizontal":
                return stroke(style, 1, hTicks(box, makeRange(0, lines)).map(({ point }) => Shapes.line({
                    x1: point.x,
                    y1: point.y,
                    x2: point.x + box.width,
                    y2: point.y,
                })));
        }
    }
    function paintFrame(box: Rect, { style = styles.frame, }: {
        readonly style?: GraphicsStyle;
    } = {}): ShapeList {
        return stroke(style, 1, [
            Shapes.line({ x1: box.x, y1: box.y, x2: box.x + box.width, y2: box.y }),
            Shapes.line({ x1: box.x + box.width, y1: box.y, x2: box.x + box.width, y2: box.y + box.height }),
            Shapes.line({ x1: box.x + box.width, y1: box.y + box.height, x2: box.x, y2: box.y + box.height }),
            Shapes.line({ x1: box.x, y1: box.y + box.height, x2: box.x, y2: box.y }),
        ]);
    }
    function paintAxis(box: Rect, edge: Edge, { margin = 20, style = styles.frame, }: {
        readonly margin?: number;
        readonly style?: GraphicsStyle;
    } = {}): ShapeList {
        switch (edge) {
            case "left":
                return stroke(style, 2, Shapes.line({ x1: box.x, y1: box.y - margin, x2: box.x, y2: box.y + box.height }));
            case "right":
                return stroke(style, 2, Shapes.line({ x1: box.x + box.width, y1: box.y - margin, x2: box.x + box.width, y2: box.y + box.height }));
            case "top":
                return stroke(style, 2, Shapes.line({ x1: box.x, y1: box.y, x2: box.x + box.width + margin, y2: box.y }));
            case "bottom":
                return stroke(style, 2, Shapes.line({ x1: box.x, y1: box.y + box.height, x2: box.x + box.width + margin, y2: box.y + box.height }));
        }
    }
    function paintTicks(box: Rect, range: Range, edge: Edge, { lines = 3, fmt = String, style = styles.valueLabel, }: {
        readonly lines?: number;
        readonly fmt?: (value: number) => unknown;
        readonly style?: GraphicsStyle;
    } = {}): ShapeList {
        switch (edge) {
            case "left": {
                style = { ...style, textAlign: "right", textBaseline: "middle" };
                return hTicks(box, makeTicks(range, lines)).map(({ value, point: { x, y } }) => Shapes.fillText({
                    value: fmt(value), x: x - 5, y, style,
                }));
            }
            case "right": {
                style = { ...style, textAlign: "left", textBaseline: "middle" };
                return hTicks(box, makeTicks(range, lines)).map(({ value, point: { x, y } }) => Shapes.fillText({
                    value: fmt(value), x: x + box.width + 5, y, style,
                }));
            }
            case "top": {
                style = { ...style, textAlign: "center", textBaseline: "bottom" };
                return vTicks(box, makeTicks(range, lines)).map(({ value, point: { x, y } }) => Shapes.fillText({
                    value: fmt(value), x, y: y - 5, style,
                }));
            }
            case "bottom": {
                style = { ...style, textAlign: "center", textBaseline: "top" };
                return vTicks(box, makeTicks(range, lines)).map(({ value, point: { x, y } }) => Shapes.fillText({
                    value: fmt(value), x, y: y + box.height + 5, style,
                }));
            }
        }
    }
    function paintKeyTicks<T>(box: Rect, items: readonly T[], edge: Edge, { margin = 5, fmt = String, style = styles.keyLabel, }: {
        readonly margin?: number;
        readonly fmt?: (item: T) => unknown;
        readonly style?: GraphicsStyle;
    } = {}): ShapeList {
        switch (edge) {
            case "left": {
                style = { ...style, textAlign: "right", textBaseline: "middle" };
                return hBoxes(box, items, { margin }).map(({ value, rect }) => Shapes.fillText({ value: fmt(value), x: box.x - 4, y: rect.cy, style }));
            }
            case "right": {
                style = { ...style, textAlign: "left", textBaseline: "middle" };
                return hBoxes(box, items, { margin }).map(({ value, rect }) => Shapes.fillText({ value: fmt(value), x: box.x + box.width + 4, y: rect.cy, style }));
            }
            case "top": {
                style = { ...style, textAlign: "center", textBaseline: "bottom" };
                return vBoxes(box, items, { margin }).map(({ value, rect }) => Shapes.fillText({ value: fmt(value), x: rect.cx, y: box.y - 3, style }));
            }
            case "bottom": {
                style = { ...style, textAlign: "center", textBaseline: "top" };
                return vBoxes(box, items, { margin }).map(({ value, rect }) => Shapes.fillText({ value: fmt(value), x: rect.cx, y: box.y + box.height + 3, style }));
            }
        }
    }
    function paintNoData(box: Rect, formatMessage: (d: MessageDescriptor) => string): ShapeList {
        return [
            Shapes.fillText({ value: formatMessage({ id: "stats.emptyChart.header", defaultMessage: "Not enough data" }), x: box.cx, y: box.cy, style: { ...styles.headerText, textAlign: "center", textBaseline: "bottom" } }),
            Shapes.fillText({ value: formatMessage({ id: "stats.emptyChart.description", defaultMessage: "Complete a few more lessons to get more data points." }), x: box.cx, y: box.cy, style: { ...styles.subheaderText, textAlign: "center", textBaseline: "top" } }),
        ];
    }
    return { styles, paintGrid, paintFrame, paintAxis, paintTicks, paintKeyTicks, paintNoData };
}
function makeTicks({ min, max }: Range, count: number): number[] {
    if (count < 2) {
        throw new Error();
    }
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(((max - min) / (count - 1)) * i + min);
    }
    return result;
}
function makeRange(from: number, to: number): number[] {
    return new Array<number>(to - from).fill(0).map((_, index) => index + from);
}
