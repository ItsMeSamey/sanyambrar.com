import { Marker } from "../chart/Marker.tsx";
import { ProgressOverviewChart } from "../chart/ProgressOverviewChart.tsx";
import { type KeyStatsMap } from "../result/keystats.ts";
import { Explainer } from "../widget/components/explainer/Explainer.tsx";
import { Figure } from "../widget/components/figure/Figure.tsx";
import { FormattedMessage } from "../intl/runtime.tsx";
import { ChartWrapper } from "./ChartWrapper.tsx";
export function ProgressOverviewSection(props: {
    keyStatsMap: KeyStatsMap;
}) {
    return (<Figure>
      <Figure.Caption>
        <FormattedMessage id="stats.chart.progressOverview.caption" defaultMessage="Learning Progress Overview"/>
      </Figure.Caption>

      <Explainer>
        <Figure.Description>
          <FormattedMessage id="stats.chart.progressOverview.description" defaultMessage="This chart shows the learning progress overview for all keys."/>
        </Figure.Description>
      </Explainer>

      <ChartWrapper>
        <ProgressOverviewChart keyStatsMap={props.keyStatsMap} width="100%" height="35rem"/>
      </ChartWrapper>

      <Figure.Legend>
        <FormattedMessage id="stats.chart.progressOverview.legend" defaultMessage="Horizontal axis: lesson number. Vertical axis: typing speed for each individual key, {label1} – slow, {label2} – fast." values={{
            label1: <Marker type="slow"/>,
            label2: <Marker type="fast"/>,
        }}/>
      </Figure.Legend>
    </Figure>);
}
