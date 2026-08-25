import { useFormatter } from "@keybr/lesson-ui";
import { type Distribution, Range } from "@keybr/math";
import { type ReactNode } from "react";
import { DistributionHistogram } from "./DistributionHistogram.tsx";
import { type SizeProps } from "./Chart.tsx";
import { type Threshold } from "./types.ts";

export function SpeedHistogram({
  distribution,
  thresholds,
  width,
  height,
}: {
  readonly distribution: Distribution;
  readonly thresholds: readonly Threshold[];
} & SizeProps): ReactNode {
  const { formatSpeed } = useFormatter();
  return (
    <DistributionHistogram
      distribution={distribution}
      thresholds={thresholds}
      width={width}
      height={height}
      indexRange={(_, indexes) => Range.from(indexes)}
      thresholdIndex={(_, value) => value}
      formatIndex={(_, index) => formatSpeed(index)}
    />
  );
}
