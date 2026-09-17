import { KeySpeedChart } from "../chart/KeySpeedChart.tsx";
import { Marker } from "../chart/Marker.tsx";
import { LessonKey } from "../lesson/key.ts";
import { Target } from "../lesson/target.ts";
import { KeyDetails } from "../lesson-ui/KeyDetails.tsx";
import { KeySelector } from "../lesson-ui/KeySelector.tsx";
import { hasData } from "../math/util.ts";
import { type KeyStatsMap } from "../result/keystats.ts";
import { useSettings } from "../settings/context.ts";
import { Explainer } from "../widget/components/explainer/Explainer.tsx";
import { Figure } from "../widget/components/figure/Figure.tsx";
import { Para } from "../widget/components/text/Para.tsx";

import { createMemo, createSignal } from 'solid-js';
import { FormattedMessage } from "../intl/runtime.tsx";
import { ChartWrapper } from "./ChartWrapper.tsx";
import { SmoothnessRange } from "./SmoothnessRange.tsx";
export function KeySpeedChartSection(props: {
    keyStatsMap: KeyStatsMap;
}) {
    const { settings } = useSettings();
    const letters = () => props.keyStatsMap.letters;
    const [choice, setCurrent] = createSignal(() => letters()[0]);
    const current = () => letters().includes(choice()) ? choice() : letters()[0];
    const [smoothness, setSmoothness] = createSignal(0.5);
    const target = createMemo(() => new Target(settings));
    const keyStats = createMemo(() => props.keyStatsMap.get(current()));
    const samples = () => keyStats().samples;
    return (<Figure>
      <Figure.Caption>
        <FormattedMessage id="stats.chart.keySpeed.caption" defaultMessage="Key Typing Speed"/>
      </Figure.Caption>

      <Explainer>
        <Figure.Description>
          <FormattedMessage id="stats.chart.keySpeed.description" defaultMessage="This chart shows the typing speed change for each individual key."/>
        </Figure.Description>
      </Explainer>

      <Para align="center">
        <KeySelector keyStatsMap={props.keyStatsMap} current={current()} onSelect={(current) => {
            setCurrent(current);
        }}/>
      </Para>

      <Para align="center">
        <KeyDetails lessonKey={LessonKey.from(keyStats(), target())}/>
      </Para>

      <ChartWrapper>
        <KeySpeedChart samples={samples()} smoothness={smoothness()} width="100%" height="25rem"/>
      </ChartWrapper>

      <SmoothnessRange disabled={!hasData(samples())} value={smoothness()} onChange={setSmoothness}/>

      <Figure.Legend>
        <FormattedMessage id="stats.chart.keySpeed.legend" defaultMessage="Horizontal axis: lesson number. Vertical axis: {label1} – typing speed for the currently selected key, {label2} – target typing speed." values={{
            label1: <Marker type="speed"/>,
            label2: <Marker type="threshold"/>,
        }}/>
      </Figure.Legend>
    </Figure>);
}
