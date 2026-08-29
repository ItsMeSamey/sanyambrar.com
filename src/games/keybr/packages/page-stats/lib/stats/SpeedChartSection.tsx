import { Marker, SpeedChart } from "@keybr/chart";
import { hasData } from "@keybr/math";
import { type Result } from "@keybr/result";
import { Explainer, Figure } from "@keybr/widget";
import { useState } from "@keybr/solid-compat/react";
import { FormattedMessage } from "@keybr/solid-compat/intl";
import { ChartWrapper } from "./ChartWrapper.tsx";
import { SmoothnessRange } from "./SmoothnessRange.tsx";
export function SpeedChartSection(solidProps: {
    results: readonly Result[];
}) {
    const [smoothness, setSmoothness] = useState(0.5);
    return (<Figure>
      <Figure.Caption>
        <FormattedMessage id="stats.chart.speed.caption" defaultMessage="Typing Speed"/>
      </Figure.Caption>

      <Explainer>
        <Figure.Description>
          <FormattedMessage id="stats.chart.speed.description" defaultMessage="This chart shows how overall typing speed changes over time."/>
        </Figure.Description>
      </Explainer>

      <ChartWrapper>
        <SpeedChart results={solidProps.results} smoothness={smoothness()} width="100%" height="25rem"/>
      </ChartWrapper>

      <SmoothnessRange disabled={!hasData(solidProps.results)} value={smoothness()} onChange={setSmoothness}/>

      <Figure.Legend>
        <FormattedMessage id="stats.chart.speed.legend" defaultMessage="Horizontal axis: lesson number. Vertical axis: {label1} – typing speed, {label2} – typing accuracy, {label3} – number of keys in the lessons." values={{
            label1: <Marker type="speed"/>,
            label2: <Marker type="accuracy"/>,
            label3: <Marker type="complexity"/>,
        }}/>
      </Figure.Legend>
    </Figure>);
}
