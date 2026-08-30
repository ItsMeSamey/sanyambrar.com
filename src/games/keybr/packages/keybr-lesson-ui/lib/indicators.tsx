import { type DailyGoal as DailyGoalType, type LessonKey, type LessonKeys, } from "@keybr/lesson";
import { type StreakList as StreakListType, type SummaryStats, } from "@keybr/result";
import { Name } from "@keybr/widget";
import { memo } from "@keybr/solid-compat/react";
import { useIntl } from "@keybr/solid-compat/intl";
import { CurrentKey } from "./CurrentKey.tsx";
import { DailyGoal } from "./DailyGoal.tsx";
import { GaugeList } from "./gauges.tsx";
import * as styles from "./indicators.module.css";
import { KeySet } from "./KeySet.tsx";
import { type Names } from "./names.ts";
import { StreakList } from "./StreakList.tsx";
export const GaugeRow = memo(function GaugeRow(solidProps: {
    summaryStats: SummaryStats;
    names?: Names;
}) {
    const { formatMessage } = useIntl();
    return (<div class={styles.row}>
      <Name className={styles.name} name={formatMessage({
            id: "t_Metrics",
            defaultMessage: "Metrics",
        })}/>
      <GaugeList summaryStats={solidProps.summaryStats} names={solidProps.names}/>
    </div>);
});
export const KeySetRow = memo(function KeySetRow(solidProps: {
    lessonKeys: LessonKeys;
    names?: Names;
    onKeyHoverIn?: (key: LessonKey, elem: Element) => void;
    onKeyHoverOut?: (key: LessonKey, elem: Element) => void;
    onKeyClick?: (key: LessonKey, elem: Element) => void;
}) {
    const { formatMessage } = useIntl();
    return (<div class={`${styles.row} ${styles.keySetRow}`}>
      <Name className={styles.name} name={formatMessage({
            id: "t_All_keys",
            defaultMessage: "All keys",
        })}/>
      <KeySet id={solidProps.names?.keySet} className={`${styles.value} ${styles.keySetValue}`} lessonKeys={solidProps.lessonKeys} onKeyHoverIn={solidProps.onKeyHoverIn} onKeyHoverOut={solidProps.onKeyHoverOut} onKeyClick={solidProps.onKeyClick}/>
    </div>);
});
export const CurrentKeyRow = memo(function CurrentKeyRow(solidProps: {
    lessonKeys: LessonKeys;
    names?: Names;
}) {
    const { formatMessage } = useIntl();
    return (<div class={styles.row}>
      <Name className={styles.name} name={formatMessage({
            id: "t_Current_key",
            defaultMessage: "Current key",
        })}/>
      <CurrentKey id={solidProps.names?.currentKey} className={styles.value} lessonKeys={solidProps.lessonKeys}/>
    </div>);
});
export const StreakListRow = memo(function StreakListRow(solidProps: {
    streakList: StreakListType;
    names?: Names;
}) {
    const { formatMessage } = useIntl();
    return (<div class={styles.row}>
      <Name className={styles.name} name={formatMessage({
            id: "t_Accuracy",
            defaultMessage: "Accuracy",
        })}/>
      <StreakList id={solidProps.names?.streakList} className={styles.value} streakList={solidProps.streakList}/>
    </div>);
});
export const DailyGoalRow = memo(function DailyGoalRow(solidProps: {
    dailyGoal: DailyGoalType;
    names?: Names;
}) {
    const { formatMessage } = useIntl();
    return (<div class={styles.row}>
      <Name className={styles.name} name={formatMessage({
            id: "t_Daily_goal",
            defaultMessage: "Daily goal",
        })}/>
      <DailyGoal id={solidProps.names?.dailyGoal} className={styles.value} dailyGoal={solidProps.dailyGoal}/>
    </div>);
});
