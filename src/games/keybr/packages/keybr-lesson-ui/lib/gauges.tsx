import { useIntlNumbers } from "@keybr/intl";
import { type SummaryStats } from "@keybr/result";
import { type ClassName, Name, Value } from "@keybr/widget";
import { clsx } from "@keybr/solid-compat/clsx";
import { memo, type ReactNode } from "@keybr/solid-compat/react";
import { useIntl } from "@keybr/solid-compat/intl";
import { useFormatter } from "./format.ts";
import * as styles from "./gauges.module.css";
import { type Names } from "./names.ts";
export const GaugeList = memo(function GaugeRow(solidProps: {
    summaryStats: SummaryStats;
    names?: Names;
}) {
    return (<div class={styles.gaugeList}>
      <SpeedGauge summaryStats={solidProps.summaryStats} names={solidProps.names}/>
      <AccuracyGauge summaryStats={solidProps.summaryStats} names={solidProps.names}/>
      <ScoreGauge summaryStats={solidProps.summaryStats} names={solidProps.names}/>
    </div>);
});
export const SpeedGauge = memo(function SpeedGauge(solidProps: {
    summaryStats: SummaryStats;
    names?: Names;
}) {
    const { formatMessage } = useIntl();
    const { formatSpeed } = useFormatter();
    const last = () => solidProps.summaryStats.speed.last;
    const delta = () => solidProps.summaryStats.speed.delta;
    return (<Gauge id={solidProps.names?.speed} name={<Name name={formatMessage({
                id: "t_Speed",
                defaultMessage: "Speed",
            })}/>} value={<Value value={formatSpeed(last())}/>} delta={<Value value={signed(formatSpeed(delta()), delta())} delta={delta()} title={formatMessage({
                id: "metric.difference.description",
                defaultMessage: "The difference from the average value.",
            })}/>} title={formatMessage({
            id: "metric.speed.description",
            defaultMessage: "Typing speed in the last lesson.",
        })}/>);
});
export const AccuracyGauge = memo(function AccuracyGauge(solidProps: {
    summaryStats: SummaryStats;
    names?: Names;
}) {
    const { formatMessage } = useIntl();
    const { formatPercents } = useIntlNumbers();
    const last = () => solidProps.summaryStats.accuracy.last;
    const delta = () => solidProps.summaryStats.accuracy.delta;
    return (<Gauge id={solidProps.names?.accuracy} name={<Name name={formatMessage({
                id: "t_Accuracy",
                defaultMessage: "Accuracy",
            })}/>} value={<Value value={formatPercents(last())}/>} delta={<Value value={signed(formatPercents(delta()), delta())} delta={delta()} title={formatMessage({
                id: "metric.difference.description",
                defaultMessage: "The difference from the average value.",
            })}/>} title={formatMessage({
            id: "metric.accuracy.description",
            defaultMessage: "The percentage of characters typed without errors in the last lesson.",
        })}/>);
});
export const ScoreGauge = memo(function ScoreGauge(solidProps: {
    summaryStats: SummaryStats;
    names?: Names;
}) {
    const { formatMessage } = useIntl();
    const { formatNumber } = useIntlNumbers();
    const last = () => solidProps.summaryStats.score.last;
    const delta = () => solidProps.summaryStats.score.delta;
    return (<Gauge id={solidProps.names?.score} name={<Name name={formatMessage({
                id: "t_Score",
                defaultMessage: "Score",
            })}/>} value={<Value value={formatNumber(last(), 0)}/>} delta={<Value value={signed(formatNumber(delta(), 0), delta())} delta={delta()} title={formatMessage({
                id: "metric.difference.description",
                defaultMessage: "The difference from the average value.",
            })}/>} title={formatMessage({
            id: "metric.score.description",
            defaultMessage: "Score of the last lesson in abstract points. " +
                "Scores are greater when you type faster and with fewer errors.",
        })}/>);
});
export const Gauge = memo(function Gauge(solidProps: {
    id?: string;
    className?: ClassName;
    name: ReactNode;
    value: ReactNode;
    delta: ReactNode;
    title: string;
}) {
    return (<span id={solidProps.id} class={clsx(styles.gauge, solidProps.className)} title={solidProps.title}>
      {solidProps.name} {solidProps.value} ({solidProps.delta})
    </span>);
});
function signed(value: any, delta: number): string {
    const s = String(value);
    if (delta > 0) {
        return `\u2191+${s}`;
    }
    if (delta < 0) {
        return `\u2193${s}`;
    }
    return s;
}
