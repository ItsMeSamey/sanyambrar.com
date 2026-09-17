import { useIntlNumbers } from "../intl/numbers.ts";
import { type DailyStats as DailyStatsType } from "../result/dailystats.ts";
import { formatDuration } from "../widget/utils/format-duration.ts";
import { NameValue } from "../widget/components/text/NameValue.tsx";
import { Para } from "../widget/components/text/Para.tsx";
import { useIntl } from "../intl/runtime.tsx";
import * as styles from "./DailyStats.module.css";
import { type Effort } from "./effort.ts";
import { useFormatter } from "./format.ts";
export function DailyStats(props: {
    stats: DailyStatsType;
    effort: Effort;
}) {
    const { formatDate, formatMessage } = useIntl();
    const { formatNumber, formatPercents } = useIntlNumbers();
    const { formatSpeed } = useFormatter();
    return (<div class={styles.root}>
      <Para align="center">
        {formatDate(Number(props.stats.date), { dateStyle: "long" })}
      </Para>
      <div>
        <NameValue name={formatMessage({
            id: "t_Daily_goal",
            defaultMessage: "Daily goal",
        })} value={formatPercents(props.effort.effort(props.stats.stats.time))}/>
      </div>
      <div>
        <NameValue name={formatMessage({
            id: "t_Time",
            defaultMessage: "Time",
        })} value={formatDuration(props.stats.stats.time)}/>
      </div>
      <div>
        <NameValue name={formatMessage({
            id: "t_num_Lessons",
            defaultMessage: "Lessons",
        })} value={formatNumber(props.stats.results.length)}/>
      </div>
      <div>
        <NameValue name={formatMessage({
            id: "t_Top_speed",
            defaultMessage: "Top speed",
        })} value={formatSpeed(props.stats.stats.speed.max)}/>
      </div>
      <div>
        <NameValue name={formatMessage({
            id: "t_Average_speed",
            defaultMessage: "Average speed",
        })} value={formatSpeed(props.stats.stats.speed.avg)}/>
      </div>
      <div>
        <NameValue name={formatMessage({
            id: "t_Average_accuracy",
            defaultMessage: "Average accuracy",
        })} value={formatPercents(props.stats.stats.accuracy.avg)}/>
      </div>
    </div>);
}
