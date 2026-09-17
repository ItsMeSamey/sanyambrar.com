import { createSignal } from 'solid-js';
import { Marker } from "../chart/Marker.tsx";
import { SpeedChart } from "../chart/SpeedChart.tsx";
import { hasData } from "../math/util.ts";
import { type Result } from "../result/result.ts";
import { Explainer } from "../widget/components/explainer/Explainer.tsx";
import { Figure } from "../widget/components/figure/Figure.tsx";

import { FormattedMessage } from "../intl/runtime.tsx";
import { ChartWrapper } from "./ChartWrapper.tsx";
import { SmoothnessRange } from "./SmoothnessRange.tsx";
export function SpeedChartSection(props: {
    results: readonly Result[];
}) {
    const [smoothness, setSmoothness] = createSignal(0.5);
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
        <SpeedChart results={props.results} smoothness={smoothness()} width="100%" height="25rem"/>
      </ChartWrapper>

      <SmoothnessRange disabled={!hasData(props.results)} value={smoothness()} onChange={setSmoothness}/>

      <Figure.Legend>
        <FormattedMessage id="stats.chart.speed.legend" defaultMessage="Horizontal axis: lesson number. Vertical axis: {label1} – typing speed, {label2} – typing accuracy, {label3} – number of keys in the lessons." values={{
            label1: <Marker type="speed"/>,
            label2: <Marker type="accuracy"/>,
            label3: <Marker type="complexity"/>,
        }}/>
      </Figure.Legend>
    </Figure>);
}
