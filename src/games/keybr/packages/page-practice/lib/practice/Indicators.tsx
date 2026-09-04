import { type LessonKey } from "@keybr/lesson";
import { CurrentKeyRow, DailyGoalRow, GaugeRow, KeySetRow, names, StreakListRow, } from "@keybr/lesson-ui";
import { Popup, Portal, useHoverPopup } from "@keybr/widget";
import { memo, type ReactNode } from "@keybr/solid-compat/react";
import * as styles from "./Indicators.module.css";
import { KeyExtendedDetails } from "./KeyExtendedDetails.tsx";
import { type LessonState } from "./state/index.ts";
export const Indicators = memo(function Indicators(props: {
    readonly state: LessonState;
}): ReactNode {
    const popup = useHoverPopup<{ key: LessonKey; elem: Element }>();
    return (<div id={names.indicators} class={styles.indicators}>
      <GaugeRow summaryStats={props.state.summaryStats} names={names}/>
      <KeySetRow lessonKeys={props.state.lessonKeys} names={names} onKeyHoverIn={(key, elem) => {
            popup.show({ key, elem });
        }} onKeyHoverOut={popup.leave}/>
      <CurrentKeyRow lessonKeys={props.state.lessonKeys} names={names}/>
      <StreakListRow streakList={props.state.streakList} names={names}/>
      {props.state.dailyGoal.goal > 0 && (<DailyGoalRow dailyGoal={props.state.dailyGoal} names={names}/>)}
      {(() => {
        const current = popup.state();
        return current.type === "visible" || current.type === "visible-out" ? <Portal>
          <Popup anchor={current.elem} onMouseEnter={popup.hold} onMouseLeave={popup.dismiss}>
            <KeyExtendedDetails lessonKey={current.key} keyStats={props.state.keyStatsMap.get(current.key.letter)}/>
          </Popup>
        </Portal> : null;
      })()}
    </div>);
});
