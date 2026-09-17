import { createSignal } from 'solid-js';
import { makeSpeedDistribution } from "../chart/speed-distribution.ts";
import { SpeedHistogram } from "../chart/SpeedHistogram.tsx";
import { useIntlNumbers } from "../intl/numbers.ts";
import { type SummaryStats } from "../result/summarystats.ts";
import { Explainer } from "../widget/components/explainer/Explainer.tsx";
import { Figure } from "../widget/components/figure/Figure.tsx";
import { Para } from "../widget/components/text/Para.tsx";
import { SegmentedControl } from "../widget/components/segmented/SegmentedControl.tsx";
import { Value } from "../widget/components/text/NameValue.tsx";

import { FormattedMessage, useIntl } from "../intl/runtime.tsx";
import { ChartWrapper } from "./ChartWrapper.tsx";

type Period = "average" | "top";

export function SpeedHistogramSection(props: { readonly stats: SummaryStats }) {
  const distribution = makeSpeedDistribution();
  const { formatMessage } = useIntl();
  const { formatPercents } = useIntlNumbers();
  const [period, setPeriod] = createSignal<Period>("average");
  const value = () => (period() === "top" ? props.stats.speed.max : props.stats.speed.avg);
  const percentile = () => distribution.cdf(value());
  const threshold = () =>
    value() > 0
      ? [
          {
            label: formatMessage({
              id: period() === "average" ? "metric.averageSpeed.name" : "metric.topSpeed.name",
              defaultMessage: period() === "average" ? "Average speed" : "Top speed",
            }),
            value: value(),
          },
        ]
      : [];

  return (
    <Figure>
      <Figure.Caption>
        <FormattedMessage
          id="profile.chart.histogram.caption"
          defaultMessage="Relative Typing Speed"
        />
      </Figure.Caption>
      <Explainer>
        <Figure.Description>
          <FormattedMessage
            id="profile.chart.histogram.description"
            defaultMessage="This is the typing-speed distribution from keybr.com users, with your position shown when local lesson data is available."
          />
        </Figure.Description>
      </Explainer>

      <Para align="center">
        {value() > 0 ? (
          period() === "average" ? (
            <FormattedMessage
              id="profile.chart.compareAverageSpeed.description"
              defaultMessage="Your all time average speed beats {value} of all other people."
              values={{ value: <Value value={formatPercents(percentile())} /> }}
            />
          ) : (
            <FormattedMessage
              id="profile.chart.compareTopSpeed.description"
              defaultMessage="Your all time top speed beats {value} of all other people."
              values={{ value: <Value value={formatPercents(percentile())} /> }}
            />
          )
        ) : (
          <FormattedMessage
            id="profile.chart.populationOnly.description"
            defaultMessage="Complete a lesson to place your speed on the population curve."
          />
        )}
      </Para>

      <ChartWrapper>
        <SpeedHistogram
          distribution={distribution}
          thresholds={threshold()}
          width="100%"
          height="25rem"
        />
      </ChartWrapper>

      <SegmentedControl<Period>
        label="Speed comparison"
        value={period()}
        options={[
          { value: "average", label: "Average speed" },
          { value: "top", label: "Top speed" },
        ]}
        onChange={setPeriod}
      />

      <Explainer>
        <Figure.Legend>
          <FormattedMessage
            id="profile.chart.histogram.legend"
            defaultMessage="The bars are the fixed keybr.com population distribution. The cumulative line and marker show how your speed compares with it."
          />
        </Figure.Legend>
      </Explainer>
    </Figure>
  );
}
