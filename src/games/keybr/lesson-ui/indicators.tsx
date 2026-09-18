import { type DailyGoal as DailyGoalType } from "../lesson/dailygoal.ts";
import { type LessonKey, type LessonKeys } from "../lesson/key.ts";
import { type StreakList as StreakListType } from "../result/accuracy.ts";
import { type SummaryStats } from "../result/summarystats.ts";
import { Name } from "../widget/components/text/NameValue.tsx";

import { FormattedMessage, useIntl } from "../intl/runtime.tsx";
import { Show } from "solid-js";
import { styleTextTruncate } from "../widget/styles/text.ts";
import { Key } from "./Key.tsx";
import { KeyDetails } from "./KeyDetails.tsx";
import { DailyGoal } from "./DailyGoal.tsx";
import { GaugeList } from "./gauges.tsx";
import styles from "./indicators.module.css";
import { KeySet } from "./KeySet.tsx";
import { type Names } from "./names.ts";
import { StreakList } from "./StreakList.tsx";
export const GaugeRow = function GaugeRow(props: {
    summaryStats: SummaryStats;
    names?: Names;
}) {
    const { formatMessage } = useIntl();
    return (<div class={styles.row}>
      <Name className={styles.name} name={formatMessage({
            id: "t_Metrics",
            defaultMessage: "Metrics",
        })}/>
      <GaugeList summaryStats={props.summaryStats} names={props.names}/>
    </div>);
};
export const KeySetRow = function KeySetRow(props: {
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
      <KeySet id={props.names?.keySet} className={`${styles.value} ${styles.keySetValue}`} lessonKeys={props.lessonKeys} onKeyHoverIn={props.onKeyHoverIn} onKeyHoverOut={props.onKeyHoverOut} onKeyClick={props.onKeyClick}/>
    </div>);
};
export const CurrentKeyRow = function CurrentKeyRow(props: {
    lessonKeys: LessonKeys;
    names?: Names;
}) {
    const { formatMessage } = useIntl();
    return (<div class={styles.row}>
      <Name className={styles.name} name={formatMessage({
            id: "t_Current_key",
            defaultMessage: "Current key",
        })}/>
      <CurrentKey id={props.names?.currentKey} className={styles.value} lessonKeys={props.lessonKeys}/>
    </div>);
};
export const StreakListRow = function StreakListRow(props: {
    streakList: StreakListType;
    names?: Names;
}) {
    const { formatMessage } = useIntl();
    return (<div class={styles.row}>
      <Name className={styles.name} name={formatMessage({
            id: "t_Accuracy",
            defaultMessage: "Accuracy",
        })}/>
      <StreakList id={props.names?.streakList} className={styles.value} streakList={props.streakList}/>
    </div>);
};
export const DailyGoalRow = function DailyGoalRow(props: {
    dailyGoal: DailyGoalType;
    names?: Names;
}) {
    const { formatMessage } = useIntl();
    return (<div class={styles.row}>
      <Name className={styles.name} name={formatMessage({
            id: "t_Daily_goal",
            defaultMessage: "Daily goal",
        })}/>
      <DailyGoal id={props.names?.dailyGoal} className={styles.value} dailyGoal={props.dailyGoal}/>
    </div>);
};

const CurrentKey = (props: { id?: string; className?: string; lessonKeys: LessonKeys }) => {
    const focusedKey = () => props.lessonKeys.findFocusedKey();
    return <span id={props.id} class={props.className}>
      <Show when={focusedKey()} keyed fallback={<span class={styleTextTruncate}>
        <FormattedMessage id="t_All_keys_are_unlocked" defaultMessage="All keys are unlocked."/>
      </span>}>{(key) => <><Key lessonKey={key}/> <KeyDetails lessonKey={key}/></>}</Show>
    </span>;
};
