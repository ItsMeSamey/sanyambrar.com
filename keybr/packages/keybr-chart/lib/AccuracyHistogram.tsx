import { useIntlNumbers } from "@keybr/intl";
import { type Distribution, Range } from "@keybr/math";
import { type ReactNode } from "react";
import { type SizeProps } from "./Chart.tsx";
import { DistributionHistogram } from "./DistributionHistogram.tsx";
import { type Threshold } from "./types.ts";

export function AccuracyHistogram({
  distribution,
  thresholds,
  width,
  height,
}: {
  readonly distribution: Distribution;
  readonly thresholds: readonly Threshold[];
} & SizeProps): ReactNode {
  const { formatPercents } = useIntlNumbers();
  return (
    <DistributionHistogram
      distribution={distribution}
      thresholds={thresholds}
      width={width}
      height={height}
      indexRange={(dist) => new Range(dist.scale(0.8), dist.scale(1.0))}
      thresholdIndex={(dist, value) => dist.scale(value)}
      formatIndex={(dist, index) => formatPercents(dist.unscale(index))}
    />
  );
}
