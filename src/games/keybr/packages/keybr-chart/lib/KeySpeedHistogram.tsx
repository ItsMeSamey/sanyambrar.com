import { useFormatter } from "@keybr/lesson-ui";
import { hasData, Histogram, KeySet, Range } from "@keybr/math";
import { type KeyStatsMap, timeToSpeed } from "@keybr/result";
import { type Rect, type ShapeList } from "@keybr/widget";
import { type ReactNode } from "@keybr/solid-compat/react";
import { useIntl } from "@keybr/solid-compat/intl";
import { ChartCanvas, type SizeProps } from "./Chart.tsx";
import { withStyles } from "./decoration.ts";
import { paintHistogram } from "./graph.ts";
import { reactivePaint } from "./reactive-paint.ts";
import { type ChartStyles, useChartStyles } from "./use-chart-styles.ts";
export function KeySpeedHistogram(solidProps: {
    readonly keyStatsMap: KeyStatsMap;
} & SizeProps): ReactNode {
    const styles = useChartStyles();
    const paint = usePaint(styles, () => solidProps.keyStatsMap);
    return <ChartCanvas styles={styles} paint={paint} width={solidProps.width} height={solidProps.height}/>;
}
function usePaint(styles: ChartStyles, keyStatsMap: () => KeyStatsMap) {
    const { formatMessage } = useIntl();
    const { formatSpeed } = useFormatter();
    return reactivePaint(() => {
        const currentKeyStatsMap = keyStatsMap();
        const g = withStyles(styles);
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
                paintHistogram(box, vSpeed, rSpeed, { style: styles.speed }),
                g.paintFrame(box),
                g.paintTicks(box, rSpeed, "left", { fmt: formatSpeed }),
                g.paintKeyTicks(box, letters, "bottom"),
            ];
        };
    });
}
