import { useIntlNumbers } from "@keybr/intl";
import { useFormatter } from "@keybr/lesson-ui";
import { type Distribution, Range, Vector } from "@keybr/math";
import { type Rect, type ShapeList, Shapes } from "@keybr/widget";
import { type ReactNode } from "@keybr/solid-compat/react";
import { ChartCanvas, type SizeProps } from "./Chart.tsx";
import { withStyles } from "./decoration.ts";
import { reactivePaint } from "./reactive-paint.ts";
import { type ChartStyles, useChartStyles } from "./use-chart-styles.ts";

export type SpeedThreshold = Readonly<{ label: string; value: number }>;

export function SpeedHistogram(props: {
  readonly distribution: Distribution;
  readonly thresholds: readonly SpeedThreshold[];
} & SizeProps): ReactNode {
  const styles = useChartStyles();
  const paint = usePaint(styles, () => props.distribution, () => props.thresholds);
  return (
    <ChartCanvas
      styles={styles}
      paint={paint}
      width={props.width}
      height={props.height}
    />
  );
}

function usePaint(
  styles: ChartStyles,
  distribution: () => Distribution,
  thresholds: () => readonly SpeedThreshold[],
) {
  const { formatPercents } = useIntlNumbers();
  const { formatSpeed } = useFormatter();
  return reactivePaint(() => {
    const currentDistribution = distribution();
    const currentThresholds = thresholds();
    const g = withStyles(styles);

    const indices = new Vector();
    const pmf = new Vector();
    const cdf = new Vector();
    for (const sample of currentDistribution) {
      indices.add(sample.index);
      pmf.add(sample.pmf);
      cdf.add(sample.cdf);
    }
    const indexRange = Range.from(indices);
    const pmfRange = Range.from(pmf);
    const cdfRange = Range.from(cdf);

    return (box: Rect): ShapeList => [
      g.paintGrid(box, "horizontal", { lines: 5 }),
      g.paintGrid(box, "vertical", { lines: 5 }),
      g.paintAxis(box, "bottom"),
      g.paintAxis(box, "left"),
      paintPmf(box),
      paintCdf(box),
      currentThresholds.map((threshold) => paintSpeedMarker(box, threshold)),
      currentThresholds.map((threshold) => paintPercentileMarker(box, threshold)),
      g.paintTicks(box, indexRange, "bottom", {
        lines: 5,
        fmt: formatSpeed,
        style: styles.valueLabel,
      }),
      g.paintTicks(box, cdfRange, "right", {
        lines: 5,
        fmt: formatPercents,
        style: styles.thresholdLabel,
      }),
    ];

    function paintPmf(box: Rect): ShapeList {
      return Shapes.fill(
        styles.speed,
        [...indexRange.steps()].map((index) => {
          const width = Math.ceil(box.width / indexRange.span);
          const x = Math.round(indexRange.normalize(index, 1) * box.width);
          const height = Math.round(pmfRange.normalize(pmf.at(index)) * box.height);
          return Shapes.rect({
            x: box.x + x,
            y: box.y + box.height - height,
            width,
            height,
          });
        }),
      );
    }

    function paintCdf(box: Rect): ShapeList {
      const points = [...indexRange.steps()].map((index) => ({
        x: box.x + indexRange.normalize(index, 1) * box.width,
        y: box.y + box.height - cdfRange.normalize(cdf.at(index)) * box.height,
      }));
      const line = Shapes.polyline(points);
      return [
        Shapes.stroke({ ...styles.background, lineWidth: 4, lineCap: "round", lineJoin: "round" }, line),
        Shapes.stroke({ ...styles.threshold, lineWidth: 2, lineCap: "round", lineJoin: "round" }, line),
      ];
    }

    function paintSpeedMarker(box: Rect, { label, value }: SpeedThreshold): ShapeList {
      if (!(value >= indexRange.min && value <= indexRange.max)) return [];
      const x = Math.round(indexRange.normalize(value) * box.width);
      return [
        Shapes.stroke({ ...styles.background, lineWidth: 5, lineCap: "round" }, Shapes.line({
          x1: box.x + x, y1: box.y - 10, x2: box.x + x, y2: box.y + box.height + 10,
        })),
        Shapes.stroke({ ...styles.value, lineWidth: 2, lineCap: "round" }, Shapes.line({
          x1: box.x + x, y1: box.y - 10, x2: box.x + x, y2: box.y + box.height + 10,
        })),
        Shapes.fillText({
          x: box.x + x + 5,
          y: box.y + box.height - 5,
          value: `${label}: ${formatSpeed(value)}`,
          style: {
            ...styles.valueLabel,
            textAlign: "left",
            textBaseline: "bottom",
          },
        }),
      ];
    }

    function paintPercentileMarker(
      box: Rect,
      { value }: SpeedThreshold,
    ): ShapeList {
      if (!(value >= indexRange.min && value <= indexRange.max)) return [];
      const percentile = currentDistribution.cdf(value);
      const y = Math.round(cdfRange.normalize(percentile) * box.height);
      return [
        Shapes.stroke({ ...styles.background, lineWidth: 5, lineCap: "round" }, Shapes.line({
          x1: box.x - 10, y1: box.y + box.height - y, x2: box.x + box.width + 10, y2: box.y + box.height - y,
        })),
        Shapes.stroke({ ...styles.threshold, lineWidth: 2, lineCap: "round" }, Shapes.line({
          x1: box.x - 10, y1: box.y + box.height - y, x2: box.x + box.width + 10, y2: box.y + box.height - y,
        })),
        Shapes.fillText({
          x: box.x + box.width - 5,
          y: box.y + box.height - y - 5,
          value: formatPercents(percentile),
          style: {
            ...styles.thresholdLabel,
            textAlign: "right",
            textBaseline: "bottom",
          },
        }),
      ];
    }
  });
}
