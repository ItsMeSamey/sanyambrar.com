import { KeySpeedChart, Marker } from "@keybr/chart";
import { LessonKey, Target } from "@keybr/lesson";
import { KeyDetails, KeySelector } from "@keybr/lesson-ui";
import { hasData } from "@keybr/math";
import { type KeyStatsMap } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import { Explainer, Figure, Para } from "@keybr/widget";
import { useState } from "@keybr/solid-compat/react";
import { createMemo } from 'solid-js';
import { FormattedMessage } from "@keybr/solid-compat/intl";
import { ChartWrapper } from "./ChartWrapper.tsx";
import { SmoothnessRange } from "./SmoothnessRange.tsx";
export function KeySpeedChartSection(solidProps: {
    keyStatsMap: KeyStatsMap;
}) {
    const { settings } = useSettings();
    const letters = () => solidProps.keyStatsMap.letters;
    const [choice, setCurrent] = useState(() => letters()[0]);
    const current = () => letters().includes(choice()) ? choice() : letters()[0];
    const [smoothness, setSmoothness] = useState(0.5);
    const target = createMemo(() => new Target(settings));
    const keyStats = createMemo(() => solidProps.keyStatsMap.get(current()));
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
        <KeySelector keyStatsMap={solidProps.keyStatsMap} current={current()} onSelect={(current) => {
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
