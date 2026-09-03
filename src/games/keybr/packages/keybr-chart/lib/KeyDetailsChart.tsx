import { useIntlNumbers } from "@keybr/intl";
import { type LearningRate, type LessonKey, Target } from "@keybr/lesson";
import { useFormatter } from "@keybr/lesson-ui";
import { Range } from "@keybr/math";
import { useSettings } from "@keybr/settings";
import { type Rect, type ShapeList, Shapes } from "@keybr/widget";
import { type ReactNode } from "@keybr/solid-compat/react";
import { useIntl } from "@keybr/solid-compat/intl";
import { ChartCanvas, type SizeProps } from "./Chart.tsx";
import { withStyles } from "./decoration.ts";
import { paintCurve, paintScatterPlot, projection } from "./graph.ts";
import { reactivePaint } from "./reactive-paint.ts";
import { type ChartStyles, useChartStyles } from "./use-chart-styles.ts";
export function KeyDetailsChart(solidProps: {
    readonly lessonKey: LessonKey;
    readonly learningRate: LearningRate | null;
} & SizeProps): ReactNode {
    const styles = useChartStyles();
    const paint = usePaint(styles, () => solidProps.lessonKey, () => solidProps.learningRate);
    return <ChartCanvas styles={styles} paint={paint} width={solidProps.width} height={solidProps.height}/>;
}
function usePaint(styles: ChartStyles, lessonKey: () => LessonKey, learningRate: () => LearningRate | null) {
    const { formatMessage } = useIntl();
    const { formatInteger } = useIntlNumbers();
    const { formatSpeed } = useFormatter();
    const { settings } = useSettings();
    return reactivePaint(() => {
        const currentLessonKey = lessonKey();
        const currentLearningRate = learningRate();
        const target = new Target(settings);
        const g = withStyles(styles);
        if (currentLearningRate == null) {
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
        const { vIndex, vSpeed, mSpeed } = currentLearningRate;
        const rIndex = Range.from(vIndex);
        const rSpeed = Range.from(vSpeed);
        rSpeed.min = target.targetSpeed;
        rSpeed.max = target.targetSpeed;
        rSpeed.round(5);
        let now = 0;
        if ((currentLessonKey.bestConfidence ?? 0) < 1) {
            now = rIndex.max;
            rIndex.max = now + 10;
        }
        return (box: Rect): ShapeList => {
            const proj = projection(box, rIndex, rSpeed);
            return [
                g.paintGrid(box, "horizontal", { lines: 5 }),
                g.paintGrid(box, "vertical", { lines: 5 }),
                g.paintAxis(box, "bottom"),
                g.paintAxis(box, "left"),
                now > 0 && paintThresholdLine({ label: "Now", value: now }),
                paintScatterPlot(proj, vIndex, vSpeed, {
                    style: styles.speed,
                }),
                paintCurve(proj, mSpeed, {
                    style: {
                        ...styles.speed,
                        lineWidth: 2,
                    },
                }),
                paintTargetSpeedLine(),
                g.paintTicks(box, rIndex, "bottom", { lines: 5, fmt: formatInteger }),
                g.paintTicks(box, rSpeed, "left", { fmt: formatSpeed }),
            ];
            function paintTargetSpeedLine(): ShapeList {
                const y = Math.round(proj.y(target.targetSpeed));
                return [
                    Shapes.stroke({ ...styles.background, lineWidth: 5, lineCap: "round" }, Shapes.line({ x1: box.x - 10, y1: y, x2: box.x + box.width + 10, y2: y })),
                    Shapes.stroke({ ...styles.threshold, lineWidth: 2, lineCap: "round" }, Shapes.line({ x1: box.x - 10, y1: y, x2: box.x + box.width + 10, y2: y })),
                    Shapes.fillText({
                        x: box.x + box.width + 15,
                        y: y,
                        value: formatSpeed(target.targetSpeed),
                        style: {
                            ...styles.thresholdLabel,
                            textAlign: "left",
                            textBaseline: "middle",
                        },
                    }),
                ];
            }
            function paintThresholdLine({ label, value, }: {
                label: string;
                value: number;
            }): ShapeList {
                const x = proj.x(value);
                return [
                    Shapes.stroke({ ...styles.background, lineWidth: 5, lineCap: "round" }, Shapes.line({ x1: x, y1: box.y - 10, x2: x, y2: box.y + box.height + 10 })),
                    Shapes.stroke({ ...styles.threshold, lineWidth: 2, lineCap: "round" }, Shapes.line({ x1: x, y1: box.y - 10, x2: x, y2: box.y + box.height + 10 })),
                    Shapes.fillText({
                        x: Math.round(x) + 2,
                        y: box.y - 1,
                        value: label,
                        style: {
                            ...styles.thresholdLabel,
                            textAlign: "left",
                            textBaseline: "bottom",
                        },
                    }),
                ];
            }
        };
    });
}
