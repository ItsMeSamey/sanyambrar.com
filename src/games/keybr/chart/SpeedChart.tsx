import type { JSX } from "@solidjs/web";
import { useIntlNumbers } from "../intl/numbers.ts";
import { useFormatter } from "../lesson-ui/format.ts";
import { hasData, smooth } from "../math/util.ts";
import { linearRegression } from "../math/linear-regression.ts";
import { Range } from "../math/range.ts";
import { Vector } from "../math/vector.ts";
import { type Result } from "../result/result.ts";
import { type Rect } from "../widget/utils/rect.ts";
import { type ShapeList } from "../widget/components/canvas/graphics.ts";

import { useIntl } from "../intl/runtime.tsx";
import { ChartCanvas, type SizeProps } from "./Chart.tsx";
import { withStyles } from "./decoration.ts";
import { paintCurve, paintScatterPlot, projection } from "./graph.ts";
import { memoizePaint } from "./memoized-paint.ts";
import { type ChartStyles, useChartStyles } from "./use-chart-styles.ts";
export function SpeedChart(props: {
    readonly results: readonly Result[];
    readonly smoothness: number;
} & SizeProps): JSX.Element {
    const styles = useChartStyles();
    const paint = usePaint(styles, () => props.results, () => props.smoothness);
    return <ChartCanvas styles={styles()} paint={paint} width={props.width} height={props.height}/>;
}
function usePaint(styles: import("solid-js").Accessor<ChartStyles>, results: () => readonly Result[], smoothness: () => number) {
    const { formatMessage } = useIntl();
    const { formatInteger, formatPercents } = useIntlNumbers();
    const { formatSpeed } = useFormatter();
    return memoizePaint(() => {
        const currentResults = results();
        const currentSmoothness = smoothness();
        const g = withStyles(styles());
        if (!hasData(currentResults)) {
            return (box: Rect): ShapeList => {
                return [
                    g.paintGrid(box, "horizontal", { lines: 5 }),
                    g.paintGrid(box, "vertical", { lines: 5 }),
                    g.paintAxis(box, "bottom"),
                    g.paintAxis(box, "left"),
                    g.paintNoData(box, formatMessage),
                ];
            };
        }
        const vIndex = new Vector();
        const vComplexity = new Vector();
        const sComplexity = smooth(currentSmoothness);
        const vAccuracy = new Vector();
        const sAccuracy = smooth(currentSmoothness);
        const vSpeed = new Vector();
        const sSpeed = smooth(currentSmoothness);
        for (let index = 0; index < currentResults.length; index++) {
            const result = currentResults[index];
            vIndex.add(index + 1);
            vComplexity.add(sComplexity(result.histogram.complexity));
            vAccuracy.add(sAccuracy(result.accuracy));
            vSpeed.add(sSpeed(result.speed));
        }
        const rIndex = Range.from(vIndex);
        const rComplexity = Range.from(vComplexity).round(1);
        const rAccuracy = Range.from(vAccuracy).round(0.01);
        const rSpeed = Range.from(vSpeed).round(5);
        rComplexity.min = 3;
        const mSpeed = linearRegression(vIndex, vSpeed);
        return (box: Rect): ShapeList => {
            const projComplexity = projection(box, rIndex, rComplexity);
            const projAccuracy = projection(box, rIndex, rAccuracy);
            const projSpeed = projection(box, rIndex, rSpeed);
            return [
                g.paintGrid(box, "horizontal", { lines: 5 }),
                g.paintGrid(box, "vertical", { lines: 5 }),
                g.paintAxis(box, "bottom"),
                g.paintAxis(box, "left"),
                paintScatterPlot(projComplexity, vIndex, vComplexity, {
                    style: styles().complexity,
                }),
                paintScatterPlot(projAccuracy, vIndex, vAccuracy, {
                    style: styles().accuracy,
                }),
                paintScatterPlot(projSpeed, vIndex, vSpeed, {
                    style: styles().speed,
                }),
                paintCurve(projSpeed, mSpeed, {
                    style: {
                        ...styles().speed,
                        lineWidth: 2,
                    },
                }),
                g.paintTicks(box, rIndex, "bottom", { lines: 5, fmt: formatInteger }),
                g.paintTicks(box, rSpeed, "left", { fmt: formatSpeed }),
                g.paintTicks(box, rAccuracy, "right", { fmt: formatPercents }),
            ];
        };
    });
}
