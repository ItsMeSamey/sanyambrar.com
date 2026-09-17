import type { JSX } from "@solidjs/web";
import { useIntlNumbers } from "../intl/numbers.ts";
import { Target } from "../lesson/target.ts";
import { useKeyStyles } from "../lesson-ui/styles.ts";
import { hasData, resample } from "../math/util.ts";
import { Range } from "../math/range.ts";
import { Vector } from "../math/vector.ts";
import { type KeyStats, type KeyStatsMap } from "../result/keystats.ts";
import { useSettings } from "../settings/context.ts";
import { type Graphics, type ShapeList, Shapes } from "../widget/components/canvas/graphics.ts";
import { type Rect } from "../widget/utils/rect.ts";

import { useIntl } from "../intl/runtime.tsx";
import { ChartCanvas, type SizeProps } from "./Chart.tsx";
import { withStyles } from "./decoration.ts";
import { hBoxes } from "./geometry.ts";
import { memoizePaint } from "./memoized-paint.ts";
import { type ChartStyles, useChartStyles } from "./use-chart-styles.ts";
export function ProgressOverviewChart(props: {
    readonly keyStatsMap: KeyStatsMap;
} & SizeProps): JSX.Element {
    const styles = useChartStyles();
    const paint = usePaint(styles, () => props.keyStatsMap);
    return <ChartCanvas styles={styles()} paint={paint} width={props.width} height={props.height}/>;
}
function usePaint(styles: import("solid-js").Accessor<ChartStyles>, keyStatsMap: () => KeyStatsMap) {
    const { formatMessage } = useIntl();
    const { formatInteger } = useIntlNumbers();
    const { settings } = useSettings();
    const keyStyles = useKeyStyles();
    return memoizePaint(() => {
        const currentKeyStatsMap = keyStatsMap();
        const target = new Target(settings);
        const g = withStyles(styles());
        const { letters, results } = currentKeyStatsMap;
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
                return Shapes.stroke({ ...styles().frame, lineWidth: 1, lineCap: "round" },
                    boxes.map(({ rect }) => Shapes.line({ x1: rect.x, y1: rect.cy, x2: rect.x + rect.width, y2: rect.cy })),
                );
            }
            function paintGraph(g: Graphics): void {
                for (const { value: letter, rect: { x, y, width, height }, } of boxes) {
                    const keyData = resample(makeKeyData(currentKeyStatsMap.get(letter)), Math.floor(width));
                    for (let i = 0; i < keyData.length; i++) {
                        const value = keyData[i];
                        if (value === value) {
                            g.fillStyle = keyStyles().confidenceForegroundColor(value);
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
    });
}
