import { useIntlDurations, useIntlNumbers } from "@keybr/intl";
import { type DailyGoal as DailyGoalType } from "@keybr/lesson";
import { type ClassName, Value } from "@keybr/widget";
import { clsx } from "@keybr/solid-compat/clsx";
import * as styles from "./DailyGoal.module.css";
export const DailyGoal = (solidProps: {
    id?: string;
    className?: ClassName;
    dailyGoal: DailyGoalType;
}) => {
    return (<span id={solidProps.id} class={clsx(styles.root, solidProps.className)}>
      <DailyGoalLabel value={solidProps.dailyGoal.value} goal={solidProps.dailyGoal.goal}/>
      <DailyGoalGauge value={solidProps.dailyGoal.value}/>
    </span>);
};
const DailyGoalLabel = (solidProps: {
    value: number;
    goal: number;
}) => {
    const { formatPercents } = useIntlNumbers();
    const { formatDuration } = useIntlDurations();
    return (<Value value={`${formatPercents(solidProps.value, 0)}/${formatDuration({ minutes: solidProps.goal })}`}/>);
};
const DailyGoalGauge = (solidProps: {
    value: number;
}) => {
    const value = () => Math.max(0, solidProps.value);
    const barWidth = () => value() > 1 ? 100 : Math.round(value() * 100);
    const frameWidth = () => value() > 1 ? Math.round((1 / value()) * 100) : 100;
    return (<div class={styles.gauge}>
      <div class={styles.bar} style={{ "inline-size": `${barWidth()}%` }}/>
      <div class={styles.frame} style={{ "inline-size": `${frameWidth()}%` }}/>
    </div>);
};
