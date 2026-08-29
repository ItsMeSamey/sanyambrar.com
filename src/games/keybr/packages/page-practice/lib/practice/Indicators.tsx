import { Tasks } from "@keybr/lang";
import { type LessonKey } from "@keybr/lesson";
import { CurrentKeyRow, DailyGoalRow, GaugeRow, KeySetRow, names, StreakListRow, } from "@keybr/lesson-ui";
import { Popup, Portal } from "@keybr/widget";
import { memo, type ReactNode, useEffect, useState } from "@keybr/solid-compat/react";
import * as styles from "./Indicators.module.css";
import { KeyExtendedDetails } from "./KeyExtendedDetails.tsx";
import { type LessonState } from "./state/index.ts";
export const Indicators = memo(function Indicators(props: {
    readonly state: LessonState;
}): ReactNode {
    type State = Readonly<{
        type: "hidden";
    } | {
        type: "visible-in";
        key: LessonKey;
        elem: Element;
    } | {
        type: "visible";
        key: LessonKey;
        elem: Element;
    } | {
        type: "visible-out";
        key: LessonKey;
        elem: Element;
    }>;
    const [state, setState] = useState<any>({ type: "hidden" });
    useEffect(() => {
        const tasks = new Tasks();
        switch (state().type) {
            case "visible-in":
                tasks.delayed(300, () => {
                    setState({ ...state(), type: "visible" });
                });
                break;
            case "visible-out":
                tasks.delayed(300, () => {
                    setState({ type: "hidden" });
                });
                break;
        }
        return () => {
            tasks.cancelAll();
        };
    }, () => [state()]);
    return (<div id={names.indicators} class={styles.indicators}>
      <GaugeRow summaryStats={props.state.summaryStats} names={names}/>
      <KeySetRow lessonKeys={props.state.lessonKeys} names={names} onKeyHoverIn={(key, elem) => {
            setState({ type: "visible-in", key, elem });
        }} onKeyHoverOut={() => {
            switch (state().type) {
                case "visible-in":
                    setState({ type: "hidden" });
                    break;
                case "visible":
                    setState({ ...state(), type: "visible-out" });
                    break;
            }
        }}/>
      <CurrentKeyRow lessonKeys={props.state.lessonKeys} names={names}/>
      <StreakListRow streakList={props.state.streakList} names={names}/>
      {props.state.dailyGoal.goal > 0 && (<DailyGoalRow dailyGoal={props.state.dailyGoal} names={names}/>)}
      {(state().type === "visible" || state().type === "visible-out") && (<Portal>
          <Popup anchor={state().elem} onMouseEnter={() => {
                setState({ ...state(), type: "visible" });
            }} onMouseLeave={() => {
                setState({ ...state(), type: "visible-out" });
            }}>
            <KeyExtendedDetails lessonKey={state().key} keyStats={props.state.keyStatsMap.get(state().key.letter)}/>
          </Popup>
        </Portal>)}
    </div>);
});
