import { KeyDetailsChart } from "@keybr/chart";
import { LearningRate, type LessonKey, Target } from "@keybr/lesson";
import { Key, KeyDetails } from "@keybr/lesson-ui";
import { type KeyStats } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import { Box } from "@keybr/widget";
import { type ReactNode } from "@keybr/solid-compat/react";
import * as styles from "./KeyExtendedDetails.module.css";
import { LearningRateDescription } from "./LearningRateDescription.tsx";
export function KeyExtendedDetails(solidProps: {
    readonly lessonKey: LessonKey;
    readonly keyStats: KeyStats;
}): ReactNode {
    const { settings } = useSettings();
    const target = new Target(settings);
    const learningRate = LearningRate.from(solidProps.keyStats.samples, target);
    return (<div class={styles.root}>
      <Box alignItems="center" justifyContent="center">
        <Key lessonKey={solidProps.lessonKey} size="large"/>
        <KeyDetails lessonKey={solidProps.lessonKey}/>
      </Box>
      <LearningRateDescription lessonKey={solidProps.lessonKey} learningRate={learningRate}/>
      <KeyDetailsChart lessonKey={solidProps.lessonKey} learningRate={learningRate} width="50rem" height="15rem"/>
    </div>);
}
