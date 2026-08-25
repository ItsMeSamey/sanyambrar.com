import { useIntlNumbers } from "@keybr/intl";
import { type Distribution, Range, Vector } from "@keybr/math";
import { type GraphicsStyle, type Rect, type ShapeList, Shapes } from "@keybr/widget";
import { type ReactNode } from "react";
import { useIntl } from "react-intl";
import { ChartCanvas, type SizeProps } from "./Chart.tsx";
import { withStyles } from "./decoration.ts";
import { type Threshold } from "./types.ts";
import { type ChartStyles, useChartStyles } from "./use-chart-styles.ts";

export function DistributionHistogram({
  distribution,
  thresholds,
  width,
  height,
  indexRange,
  thresholdIndex,
  formatIndex,
}: {
  readonly distribution: Distribution;
  readonly thresholds: readonly Threshold[];
  readonly indexRange: (distribution: Distribution, indexes: Vector) => Range;
  readonly thresholdIndex: (distribution: Distribution, value: number) => number;
  readonly formatIndex: (distribution: Distribution, index: number) => string;
} & SizeProps): ReactNode {
  const styles = useChartStyles();
  const paint = usePaint(
    styles,
    distribution,
    thresholds,
    indexRange,
    thresholdIndex,
    formatIndex,
  );
  return <ChartCanvas styles={styles} paint={paint} width={width} height={height} />;
}

function usePaint(
  styles: ChartStyles,
  dist: Distribution,
  thresholds: readonly Threshold[],
  indexRange: (distribution: Distribution, indexes: Vector) => Range,
  thresholdIndex: (distribution: Distribution, value: number) => number,
  formatIndex: (distribution: Distribution, index: number) => string,
) {
  const { formatMessage } = useIntl();
  const { formatPercents } = useIntlNumbers();
  const g = withStyles(styles);

  const vIndex = new Vector();
  const vPmf = new Vector();
  const vCdf = new Vector();
  for (const { index, pmf, cdf } of dist) {
    vIndex.add(index);
    vPmf.add(pmf);
    vCdf.add(cdf);
  }
  const rIndex = indexRange(dist, vIndex);
  const rPmf = Range.from(vPmf);
  const rCdf = Range.from(vCdf);

  return (box: Rect): ShapeList => {
    function paintValueLine(value: number): ShapeList {
    const index = thresholdIndex(dist, value);
    if (index < rIndex.min || index > rIndex.max) return [];
    const x = Math.round(rIndex.normalize(index) * box.width);
    return [
      Shapes.fill(styles.value, [
        Shapes.rect({
          x: box.x + x,
          y: box.y - 10,
          width: 1,
          height: box.height + 20,
        }),
      ]),
      Shapes.fillText({
        x: box.x + x + 5,
        y: box.y + box.height - 5,
        value: formatIndex(dist, index),
        style: { ...styles.valueLabel, textAlign: "left", textBaseline: "bottom" },
      }),
    ];
  }

    function paintThresholdLine(value: number): ShapeList {
      const index = thresholdIndex(dist, value);
      if (index < rIndex.min || index > rIndex.max) return [];
      const cdf = dist.cdf(index);
      const y = Math.round(rCdf.normalize(cdf) * box.height);
      return [
        Shapes.fill(styles.threshold, [
          Shapes.rect({
            x: box.x - 10,
            y: box.y + box.height - y,
            width: box.width + 20,
            height: 1,
          }),
        ]),
        Shapes.fillText({
          x: box.x + box.width - 5,
          y: box.y + box.height - y - 5,
          value: formatPercents(cdf),
          style: { ...styles.thresholdLabel, textAlign: "right", textBaseline: "bottom" },
        }),
      ];
    }

    return [
      g.paintGrid(box, "horizontal", { lines: 5 }),
      g.paintGrid(box, "vertical", { lines: 5 }),
      g.paintAxis(box, "bottom"),
      g.paintAxis(box, "left"),
      paintHistogram(box, rIndex, rPmf, vPmf, styles.speed),
      paintHistogram(box, rIndex, rCdf, vCdf, styles.threshold, true),
      thresholds.length > 0
        ? [
            thresholds.map(({ value }) => paintValueLine(value)),
            thresholds.map(({ value }) => paintThresholdLine(value)),
          ]
        : g.paintNoData(box, formatMessage),
      g.paintTicks(box, rIndex, "bottom", {
        lines: 5,
        fmt: (index) => formatIndex(dist, index),
        style: styles.valueLabel,
      }),
      g.paintTicks(box, rCdf, "right", {
        lines: 5,
        fmt: formatPercents,
        style: styles.thresholdLabel,
      }),
    ];
  };
}

function paintHistogram(
  box: Rect,
  indexRange: Range,
  valueRange: Range,
  values: Vector,
  style: GraphicsStyle,
  line = false,
): ShapeList {
  return Shapes.fill(
    style,
    [...indexRange.steps()].map((index) => {
      const width = Math.ceil(box.width / indexRange.span);
      const x = Math.round(indexRange.normalize(index, 1) * box.width);
      const height = Math.round(valueRange.normalize(values.at(index)) * box.height);
      return Shapes.rect({
        x: box.x + x,
        y: box.y + box.height - height - (line ? 1 : 0),
        width,
        height: line ? 1 : height,
      });
    }),
  );
}
