import { Calendar } from "../lesson-ui/Calendar.tsx";
import { EffortLegend } from "../lesson-ui/EffortLegend.tsx";
import { useEffort } from "../lesson-ui/effort.ts";
import { type DailyStatsMap } from "../result/dailystats.ts";
import { Explainer } from "../widget/components/explainer/Explainer.tsx";
import { Figure } from "../widget/components/figure/Figure.tsx";
import { FormattedMessage } from "../intl/runtime.tsx";
export function CalendarSection(props: {
    dailyStatsMap: DailyStatsMap;
}) {
    const effort = useEffort();
    return (<Figure>
      <Figure.Caption>
        <FormattedMessage id="stats.chart.calendar.caption" defaultMessage="Practice Calendar"/>
      </Figure.Caption>

      <Explainer>
        <Figure.Description>
          <FormattedMessage id="stats.chart.calendar.description" defaultMessage="This calendar shows the dates of active learning."/>
        </Figure.Description>
      </Explainer>

      <Calendar dailyStatsMap={props.dailyStatsMap} effort={effort()}/>

      <Figure.Legend>
        <EffortLegend effort={effort()}/>
      </Figure.Legend>
    </Figure>);
}
