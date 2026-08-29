import { KeySpeedHistogram } from "@keybr/chart";
import { type KeyStatsMap } from "@keybr/result";
import { Explainer, Figure } from "@keybr/widget";
import { FormattedMessage } from "@keybr/solid-compat/intl";
import { ChartWrapper } from "./ChartWrapper.tsx";
export function KeySpeedHistogramSection(solidProps: {
    keyStatsMap: KeyStatsMap;
}) {
    return (<Figure>
      <Figure.Caption>
        <FormattedMessage id="stats.chart.keySpeedHistogram.caption" defaultMessage="Key Typing Speed Histogram"/>
      </Figure.Caption>

      <Explainer>
        <Figure.Description>
          <FormattedMessage id="stats.chart.keySpeedHistogram.description" defaultMessage="This chart shows the average typing speed for each individual key."/>
        </Figure.Description>
      </Explainer>

      <ChartWrapper>
        <KeySpeedHistogram keyStatsMap={solidProps.keyStatsMap} width="100%" height="18rem"/>
      </ChartWrapper>
    </Figure>);
}
