import type { JSX } from "@solidjs/web";
import { useIntlNumbers } from "@keybr/intl";
import { type SummaryStats } from "@keybr/result";
import { type ClassName, Name, Value } from "@keybr/widget";
import { clsx } from "clsx";

import { useIntl } from "@keybr/intl";
import { useFormatter } from "./format.ts";
import * as styles from "./gauges.module.css";
import { type Names } from "./names.ts";
export const GaugeList = function GaugeRow(props: {
    summaryStats: SummaryStats;
    names?: Names;
}) {
    return (<div class={styles.gaugeList}>
      <SpeedGauge summaryStats={props.summaryStats} names={props.names}/>
      <AccuracyGauge summaryStats={props.summaryStats} names={props.names}/>
      <ScoreGauge summaryStats={props.summaryStats} names={props.names}/>
    </div>);
};
const SpeedGauge = function SpeedGauge(props: {
    summaryStats: SummaryStats;
    names?: Names;
}) {
    const { formatMessage } = useIntl();
    const { formatSpeed } = useFormatter();
    const last = () => props.summaryStats.speed.last;
    const delta = () => props.summaryStats.speed.delta;
    return (<Gauge id={props.names?.speed} name={<Name name={formatMessage({
                id: "t_Speed",
                defaultMessage: "Speed",
            })}/>} value={<Value value={formatSpeed(last())}/>} delta={<Value value={signed(formatSpeed(delta()), delta())} delta={delta()} title={formatMessage({
                id: "metric.difference.description",
                defaultMessage: "The difference from the average value.",
            })}/>} title={formatMessage({
            id: "metric.speed.description",
            defaultMessage: "Typing speed in the last lesson.",
        })}/>);
};
const AccuracyGauge = function AccuracyGauge(props: {
    summaryStats: SummaryStats;
    names?: Names;
}) {
    const { formatMessage } = useIntl();
    const { formatPercents } = useIntlNumbers();
    const last = () => props.summaryStats.accuracy.last;
    const delta = () => props.summaryStats.accuracy.delta;
    return (<Gauge id={props.names?.accuracy} name={<Name name={formatMessage({
                id: "t_Accuracy",
                defaultMessage: "Accuracy",
            })}/>} value={<Value value={formatPercents(last())}/>} delta={<Value value={signed(formatPercents(delta()), delta())} delta={delta()} title={formatMessage({
                id: "metric.difference.description",
                defaultMessage: "The difference from the average value.",
            })}/>} title={formatMessage({
            id: "metric.accuracy.description",
            defaultMessage: "The percentage of characters typed without errors in the last lesson.",
        })}/>);
};
const ScoreGauge = function ScoreGauge(props: {
    summaryStats: SummaryStats;
    names?: Names;
}) {
    const { formatMessage } = useIntl();
    const { formatNumber } = useIntlNumbers();
    const last = () => props.summaryStats.score.last;
    const delta = () => props.summaryStats.score.delta;
    return (<Gauge id={props.names?.score} name={<Name name={formatMessage({
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
};
const Gauge = function Gauge(props: {
    id?: string;
    className?: ClassName;
    name: JSX.Element;
    value: JSX.Element;
    delta: JSX.Element;
    title: string;
}) {
    return (<span id={props.id} class={clsx(styles.gauge, props.className)} title={props.title}>
      {props.name} {props.value} ({props.delta})
    </span>);
};
function signed(value: string, delta: number): string {
    const s = String(value);
    if (delta > 0) {
        return `\u2191+${s}`;
    }
    if (delta < 0) {
        return `\u2193${s}`;
    }
    return s;
}
