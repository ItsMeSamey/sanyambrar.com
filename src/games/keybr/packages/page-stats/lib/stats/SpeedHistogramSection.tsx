import { makeSpeedDistribution, SpeedHistogram } from "@keybr/chart";
import { useIntlNumbers } from "@keybr/intl";
import { type SummaryStats } from "@keybr/result";
import {
  Explainer,
  Field,
  FieldList,
  Figure,
  Para,
  RadioBox,
  Value,
} from "@keybr/widget";
import { useState } from "@keybr/solid-compat/react";
import { FormattedMessage, useIntl } from "@keybr/solid-compat/intl";
import { ChartWrapper } from "./ChartWrapper.tsx";

type Period = "average" | "top";

export function SpeedHistogramSection(props: { readonly stats: SummaryStats }) {
  const distribution = makeSpeedDistribution();
  const { formatMessage } = useIntl();
  const { formatPercents } = useIntlNumbers();
  const [period, setPeriod] = useState<Period>("average");
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
          <FormattedMessage
            id={
              period() === "average"
                ? "profile.chart.compareAverageSpeed.description"
                : "profile.chart.compareTopSpeed.description"
            }
            defaultMessage={
              period() === "average"
                ? "Your all time average speed beats {value} of all other people."
                : "Your all time top speed beats {value} of all other people."
            }
            values={{ value: <Value value={formatPercents(percentile())} /> }}
          />
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

      <FieldList>
        <Field.Filler />
        <Field>
          <RadioBox
            name="population-speed-period"
            value="average"
            checked={period() === "average"}
            label="Average Speed"
            onSelect={() => setPeriod("average")}
          />
        </Field>
        <Field>
          <RadioBox
            name="population-speed-period"
            value="top"
            checked={period() === "top"}
            label="Top Speed"
            onSelect={() => setPeriod("top")}
          />
        </Field>
        <Field.Filler />
      </FieldList>

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
