import type { JSX } from "@solidjs/web";
import { type LessonKey } from "../../lesson/key.ts";
import { CurrentKeyRow, DailyGoalRow, GaugeRow, KeySetRow, StreakListRow } from "../../lesson-ui/indicators.tsx";
import { names } from "../../lesson-ui/names.ts";
import { Popup } from "../../widget/components/popup/Popup.tsx";
import { Portal } from "../../widget/components/portal/Portal.tsx";
import { useHoverPopup } from "../../widget/hooks/use-hover-popup.ts";

import * as styles from "./Indicators.module.css";
import { KeyExtendedDetails } from "./KeyExtendedDetails.tsx";
import { type LessonState } from "./state/lesson-state.ts";
export const Indicators = function Indicators(props: {
    readonly state: LessonState;
}): JSX.Element {
    const popup = useHoverPopup<{
        key: LessonKey;
        elem: Element;
    }>();
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
};
