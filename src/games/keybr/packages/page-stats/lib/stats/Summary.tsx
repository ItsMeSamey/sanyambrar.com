import { useIntlNumbers } from "@keybr/intl";
import { useFormatter } from "@keybr/lesson-ui";
import { type SummaryStats } from "@keybr/result";
import { formatDuration, Header, Para } from "@keybr/widget";
import { FormattedMessage, useIntl } from "@keybr/solid-compat/intl";
import * as styles from "./Summary.module.css";
export function AllTimeSummary(props: {
    stats: SummaryStats;
}) {
    const { formatMessage } = useIntl();
    const { formatNumber, formatPercents } = useIntlNumbers();
    const { formatSpeed } = useFormatter();
    return (<>
      <Header level={2}>
        <FormattedMessage id="t_All_Time_Statistics" defaultMessage="All Time Statistics"/>
      </Header>

      <Para className={styles.statisticList}>
        <Statistic name={formatMessage({
            id: "t_Time",
            defaultMessage: "Time",
        })} value={formatDuration(props.stats.time)}/>

        <Statistic name={formatMessage({
            id: "t_num_Lessons",
            defaultMessage: "Lessons",
        })} value={formatNumber(props.stats.count)}/>

        <Statistic name={formatMessage({
            id: "t_Top_speed",
            defaultMessage: "Top speed",
        })} value={props.stats.speed.max > 0 ? formatSpeed(props.stats.speed.max) : "N/A"}/>

        <Statistic name={formatMessage({
            id: "t_Average_speed",
            defaultMessage: "Average speed",
        })} value={props.stats.speed.avg > 0 ? formatSpeed(props.stats.speed.avg) : "N/A"}/>

        <Statistic name={formatMessage({
            id: "t_Top_accuracy",
            defaultMessage: "Top accuracy",
        })} value={props.stats.accuracy.max > 0 ? formatPercents(props.stats.accuracy.max) : "N/A"}/>

        <Statistic name={formatMessage({
            id: "t_Average_accuracy",
            defaultMessage: "Average accuracy",
        })} value={props.stats.accuracy.avg > 0 ? formatPercents(props.stats.accuracy.avg) : "N/A"}/>
      </Para>
    </>);
}
export function TodaySummary(props: {
    stats: SummaryStats;
}) {
    const { formatMessage } = useIntl();
    const { formatNumber, formatPercents } = useIntlNumbers();
    const { formatSpeed } = useFormatter();
    return (<>
      <Header level={2}>
        <FormattedMessage id="t_Statistics_for_Today" defaultMessage="Statistics for Today"/>
      </Header>

      <Para className={styles.statisticList}>
        <Statistic name={formatMessage({
            id: "t_Time",
            defaultMessage: "Time",
        })} value={formatDuration(props.stats.time)}/>

        <Statistic name={formatMessage({
            id: "t_num_Lessons",
            defaultMessage: "Lessons",
        })} value={formatNumber(props.stats.count)}/>

        <Statistic name={formatMessage({
            id: "t_Top_speed",
            defaultMessage: "Top speed",
        })} value={props.stats.speed.max > 0 ? formatSpeed(props.stats.speed.max) : "N/A"}/>

        <Statistic name={formatMessage({
            id: "t_Average_speed",
            defaultMessage: "Average speed",
        })} value={props.stats.speed.avg > 0 ? formatSpeed(props.stats.speed.avg) : "N/A"}/>

        <Statistic name={formatMessage({
            id: "t_Top_accuracy",
            defaultMessage: "Top accuracy",
        })} value={props.stats.accuracy.max > 0 ? formatPercents(props.stats.accuracy.max) : "N/A"}/>

        <Statistic name={formatMessage({
            id: "t_Average_accuracy",
            defaultMessage: "Average accuracy",
        })} value={props.stats.accuracy.avg > 0 ? formatPercents(props.stats.accuracy.avg) : "N/A"}/>
      </Para>
    </>);
}
function Statistic(solidProps: {
    name: unknown;
    value: unknown;
}) {
    return (<span class={styles.statisticListItem} data-text-cursor-zone="">
      <span class={styles.itemName}>{String(solidProps.name) + ":"}</span>
      <span class={styles.itemValue}>{String(solidProps.value)}</span>
    </span>);
}
