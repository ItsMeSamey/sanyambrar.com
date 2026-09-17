import { useIntlDurations, useIntlNumbers } from "@keybr/intl";
import { type DailyGoal as DailyGoalType } from "@keybr/lesson";
import { type ClassName, Value } from "@keybr/widget";
import { clsx } from "clsx";
import * as styles from "./DailyGoal.module.css";
export const DailyGoal = (props: {
    id?: string;
    className?: ClassName;
    dailyGoal: DailyGoalType;
}) => {
    return (<span id={props.id} class={clsx(styles.root, props.className)}>
      <DailyGoalLabel value={props.dailyGoal.value} goal={props.dailyGoal.goal}/>
      <DailyGoalGauge value={props.dailyGoal.value}/>
    </span>);
};
const DailyGoalLabel = (props: {
    value: number;
    goal: number;
}) => {
    const { formatPercents } = useIntlNumbers();
    const { formatDuration } = useIntlDurations();
    return (<Value value={`${formatPercents(props.value, 0)}/${formatDuration({ minutes: props.goal })}`}/>);
};
const lapColors = [
    "var(--site-fg, var(--text-color))",
    "var(--site-effort-fg, #2563eb)",
    "var(--site-fast-fg, #16a34a)",
    "var(--site-warning-fg, #d4a72c)",
] as const;
const DailyGoalGauge = (props: {
    value: number;
}) => {
    const value = () => Math.max(0, Number.isFinite(props.value) ? props.value : 0);
    const whole = () => Math.floor(value());
    const fraction = () => value() - whole();
    const exactLap = () => value() > 0 && fraction() < Number.EPSILON;
    const baseLap = () => Math.max(0, whole() - 1);
    const activeLap = () => exactLap() ? Math.max(0, whole() - 1) : whole();
    const baseWidth = () => value() > 1 && !exactLap() ? 100 : 0;
    const activeWidth = () => value() <= 1
        ? Math.min(100, value() * 100)
        : exactLap()
          ? 100
          : fraction() * 100;
    const color = (lap: number) => lapColors[lap % lapColors.length];
    return (<div class={styles.gauge}>
      {baseWidth() > 0 && (<div class={styles.bar} style={{ "inline-size": `${baseWidth()}%`, "background-color": color(baseLap()) }}/>)}
      <div class={styles.bar} style={{ "inline-size": `${activeWidth()}%`, "background-color": color(activeLap()) }}/>
      <div class={styles.frame}/>
    </div>);
};
