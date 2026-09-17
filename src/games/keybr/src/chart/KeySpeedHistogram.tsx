import type { JSX } from "@solidjs/web";
import { useFormatter } from "../lesson-ui/format.ts";
import { hasData } from "../math/util.ts";
import { Histogram } from "../math/histogram.ts";
import { KeySet } from "../math/keyset.ts";
import { Range } from "../math/range.ts";
import { type KeyStatsMap } from "../result/keystats.ts";
import { timeToSpeed } from "../result/result.ts";
import { type Rect } from "../widget/utils/rect.ts";
import { type ShapeList } from "../widget/components/canvas/graphics.ts";

import { useIntl } from "../intl/runtime.tsx";
import { ChartCanvas, type SizeProps } from "./Chart.tsx";
import { withStyles } from "./decoration.ts";
import { paintHistogram } from "./graph.ts";
import { memoizePaint } from "./memoized-paint.ts";
import { type ChartStyles, useChartStyles } from "./use-chart-styles.ts";
export function KeySpeedHistogram(props: {
    readonly keyStatsMap: KeyStatsMap;
} & SizeProps): JSX.Element {
    const styles = useChartStyles();
    const paint = usePaint(styles, () => props.keyStatsMap);
    return <ChartCanvas styles={styles()} paint={paint} width={props.width} height={props.height}/>;
}
function usePaint(styles: import("solid-js").Accessor<ChartStyles>, keyStatsMap: () => KeyStatsMap) {
    const { formatMessage } = useIntl();
    const { formatSpeed } = useFormatter();
    return memoizePaint(() => {
        const currentKeyStatsMap = keyStatsMap();
        const g = withStyles(styles());
        const { letters, results } = currentKeyStatsMap;
        if (!hasData(results)) {
            return (box: Rect): ShapeList => {
                return [
                    g.paintFrame(box),
                    g.paintKeyTicks(box, letters, "bottom"),
                    g.paintNoData(box, formatMessage),
                ];
            };
        }
        const keySet = new KeySet(letters);
        const hSpeed = new Histogram(keySet);
        for (const letter of letters) {
            const keyStats = currentKeyStatsMap.get(letter);
            const { timeToType } = keyStats;
            if (timeToType != null) {
                hSpeed.set(letter, timeToSpeed(timeToType));
            }
        }
        const vSpeed = hSpeed.asVector();
        const rSpeed = Range.from(vSpeed).round(5);
        rSpeed.min = 0;
        return (box: Rect): ShapeList => {
            return [
                g.paintGrid(box, "horizontal"),
                paintHistogram(box, vSpeed, rSpeed, { style: styles().speed }),
                g.paintFrame(box),
                g.paintTicks(box, rSpeed, "left", { fmt: formatSpeed }),
                g.paintKeyTicks(box, letters, "bottom"),
            ];
        };
    });
}
