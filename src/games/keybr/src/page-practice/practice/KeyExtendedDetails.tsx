import type { JSX } from "@solidjs/web";
import { KeyDetailsChart } from "@keybr/chart";
import { LearningRate, type LessonKey, Target } from "@keybr/lesson";
import { Key, KeyDetails } from "@keybr/lesson-ui";
import { type KeyStats } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import { Box } from "@keybr/widget";

import * as styles from "./KeyExtendedDetails.module.css";
import { LearningRateDescription } from "./LearningRateDescription.tsx";
export function KeyExtendedDetails(props: {
    readonly lessonKey: LessonKey;
    readonly keyStats: KeyStats;
}): JSX.Element {
    const { settings } = useSettings();
    const learningRate = () => LearningRate.from(props.keyStats.samples, new Target(settings));
    return (<div class={styles.root}>
      <Box alignItems="center" justifyContent="center">
        <Key lessonKey={props.lessonKey} size="large"/>
        <KeyDetails lessonKey={props.lessonKey}/>
      </Box>
      <LearningRateDescription lessonKey={props.lessonKey} learningRate={learningRate()}/>
      <KeyDetailsChart lessonKey={props.lessonKey} learningRate={learningRate()} width="50rem" height="15rem"/>
    </div>);
}
