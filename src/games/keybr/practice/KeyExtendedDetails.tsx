import type { JSX } from "@solidjs/web";
import { KeyDetailsChart } from "../chart/KeyDetailsChart.tsx";
import { LearningRate } from "../lesson/learningrate.ts";
import { type LessonKey } from "../lesson/key.ts";
import { Target } from "../lesson/target.ts";
import { Key } from "../lesson-ui/Key.tsx";
import { KeyDetails } from "../lesson-ui/KeyDetails.tsx";
import { type KeyStats } from "../result/keystats.ts";
import { useSettings } from "../settings/context.ts";

import styles from "./KeyExtendedDetails.module.css";
import { LearningRateDescription } from "./LearningRateDescription.tsx";
export function KeyExtendedDetails(props: {
    readonly lessonKey: LessonKey;
    readonly keyStats: KeyStats;
}): JSX.Element {
    const { settings } = useSettings();
    const learningRate = () => LearningRate.from(props.keyStats.samples, new Target(settings));
    return (<div class={styles.root}>
      <div class={styles.summary}>
        <Key lessonKey={props.lessonKey} size="large"/>
        <KeyDetails lessonKey={props.lessonKey}/>
      </div>
      <LearningRateDescription lessonKey={props.lessonKey} learningRate={learningRate()}/>
      <KeyDetailsChart lessonKey={props.lessonKey} learningRate={learningRate()} width="50rem" height="15rem"/>
    </div>);
}
