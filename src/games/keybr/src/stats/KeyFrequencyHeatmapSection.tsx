import { KeyFrequencyHeatmap } from "../chart/KeyFrequencyHeatmap.tsx";
import { Marker } from "../chart/Marker.tsx";
import { useKeyboard } from "../keyboard/context.tsx";
import { type KeyStatsMap } from "../result/keystats.ts";
import { Explainer } from "../widget/components/explainer/Explainer.tsx";
import { Figure } from "../widget/components/figure/Figure.tsx";
import { FormattedMessage } from "../intl/runtime.tsx";
export function KeyFrequencyHeatmapSection(props: {
    keyStatsMap: KeyStatsMap;
}) {
    const keyboard = useKeyboard();
    return (<Figure>
      <Figure.Caption>
        <FormattedMessage id="stats.chart.keyFrequencyHeatmap.caption" defaultMessage="Key Frequency Heatmap"/>
      </Figure.Caption>

      <Explainer>
        <Figure.Description>
          <FormattedMessage id="stats.chart.keyFrequencyHeatmap.description" defaultMessage="This chart shows relative key frequencies as a heatmap."/>
        </Figure.Description>
      </Explainer>

      <KeyFrequencyHeatmap keyStatsMap={props.keyStatsMap} keyboard={keyboard()}/>

      <Figure.Legend>
        <FormattedMessage id="stats.chart.keyFrequencyHeatmap.legend" defaultMessage="Circle color: {label1} – hit count, {label2} – miss count." values={{
            label1: <Marker type="histogram-h"/>,
            label2: <Marker type="histogram-m"/>,
        }}/>
      </Figure.Legend>
    </Figure>);
}
