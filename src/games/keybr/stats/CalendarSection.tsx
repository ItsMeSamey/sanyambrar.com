import { Calendar } from "../lesson-ui/Calendar.tsx";
import { type Effort, useEffort } from "../lesson-ui/effort.ts";
import { useIntlNumbers } from "../intl/numbers.ts";
import styles from "./CalendarSection.module.css";
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

function EffortLegend(props: { effort: Effort }) {
    const { formatPercents } = useIntlNumbers();
    return <>
      <FormattedMessage id="t_Daily_goal:" defaultMessage="Daily goal:"/>{" "}
      {[1, 0.75, 0.5, 0.25, 0].map((value) => <span class={styles.cell}>
        <span class={styles.item} style={{ "background-color": String(props.effort.shade(value)), color: props.effort.textShade(value) }}>
          {formatPercents(value)}
        </span>
      </span>)}
    </>;
}
