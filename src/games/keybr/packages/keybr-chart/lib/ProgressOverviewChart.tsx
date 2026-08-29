import { useIntlNumbers } from "@keybr/intl";
import { Target } from "@keybr/lesson";
import { useKeyStyles } from "@keybr/lesson-ui";
import { hasData, Range, resample, Vector } from "@keybr/math";
import { type KeyStats, type KeyStatsMap } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import { type Graphics, type Rect, type ShapeList, Shapes, } from "@keybr/widget";
import { type ReactNode } from "@keybr/solid-compat/react";
import { useIntl } from "@keybr/solid-compat/intl";
import { ChartCanvas, type SizeProps } from "./Chart.tsx";
import { withStyles } from "./decoration.ts";
import { hBoxes } from "./geometry.ts";
import { type ChartStyles, useChartStyles } from "./use-chart-styles.ts";
export function ProgressOverviewChart(solidProps: {
    readonly keyStatsMap: KeyStatsMap;
} & SizeProps): ReactNode {
    const styles = useChartStyles();
    const paint = usePaint(styles, solidProps.keyStatsMap);
    return <ChartCanvas styles={styles} paint={paint} width={solidProps.width} height={solidProps.height}/>;
}
function usePaint(styles: ChartStyles, keyStatsMap: KeyStatsMap) {
    const { formatMessage } = useIntl();
    const { formatInteger } = useIntlNumbers();
    const { settings } = useSettings();
    const { confidenceForegroundColor } = useKeyStyles();
    const target = new Target(settings);
    const g = withStyles(styles);
    const { letters, results } = keyStatsMap;
    const vIndex = new Vector();
    for (let index = 0; index < results.length; index++) {
        vIndex.add(index + 1);
    }
    const rIndex = Range.from(vIndex);
    return (box: Rect): ShapeList => {
        const boxes = hBoxes(box, letters, { margin: 4 });
        return [
            paintGrid1(),
            hasData(results)
                ? [
                    g.paintGrid(box, "vertical", { lines: 5 }),
                    g.paintTicks(box, rIndex, "bottom", {
                        lines: 5,
                        fmt: formatInteger,
                    }),
                    paintGraph,
                ]
                : g.paintNoData(box, formatMessage),
            g.paintFrame(box),
            g.paintKeyTicks(box, letters, "left", { margin: 4 }),
        ];
        function paintGrid1(): ShapeList {
            return Shapes.stroke({ ...styles.frame, lineWidth: 1, lineCap: "round" },
                boxes.map(({ rect }) => Shapes.line({ x1: rect.x, y1: rect.cy, x2: rect.x + rect.width, y2: rect.cy })),
            );
        }
        function paintGraph(g: Graphics): void {
            for (const { value: letter, rect: { x, y, width, height }, } of boxes) {
                const keyData = resample(makeKeyData(keyStatsMap.get(letter)), Math.floor(width));
                for (let i = 0; i < keyData.length; i++) {
                    const value = keyData[i];
                    if (value === value) {
                        g.fillStyle = confidenceForegroundColor(value);
                        g.fillRect(x + i, y, 1, height);
                    }
                }
            }
        }
        function makeKeyData({ samples }: KeyStats): number[] {
            const data = new Array<number>(results.length).fill(NaN);
            for (const { index, timeToType } of samples) {
                if (timeToType != null) {
                    data[index] = target.confidence(timeToType);
                }
            }
            return data;
        }
    };
}
