import { KeySpeedHistogram } from "../chart/KeySpeedHistogram.tsx";
import { type KeyStatsMap } from "../result/keystats.ts";
import { Explainer } from "../widget/components/explainer/Explainer.tsx";
import { Figure } from "../widget/components/figure/Figure.tsx";
import { FormattedMessage } from "../intl/runtime.tsx";
import { ChartWrapper } from "./ChartWrapper.tsx";
export function KeySpeedHistogramSection(props: {
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
        <KeySpeedHistogram keyStatsMap={props.keyStatsMap} width="100%" height="18rem"/>
      </ChartWrapper>
    </Figure>);
}
