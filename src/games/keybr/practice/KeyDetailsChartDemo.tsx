import type { JSX } from "@solidjs/web";
import { KeyDetailsChart } from "../chart/KeyDetailsChart.tsx";
import { LearningRate } from "../lesson/learningrate.ts";
import { LessonKey } from "../lesson/key.ts";
import { lessonProps } from "../lesson/settings.ts";
import { Target } from "../lesson/target.ts";
import { Letter } from "../phonetic-model/letter.ts";
import { Settings } from "../settings/settings.ts";

import styles from "./KeyDetailsChartDemo.module.css";
export function KeyDetailsChartDemo(): JSX.Element {
    const settings = new Settings().set(lessonProps.targetSpeed, /* 35WPM */ 175);
    const target = new Target(settings);
    const lessonKey = new LessonKey({
        letter: new Letter(/* "a" */ 0x0061, 1, "A"),
        samples: [],
        timeToType: 380,
        bestTimeToType: 380,
        confidence: target.confidence(380),
        bestConfidence: target.confidence(380),
    });
    const learningRate = LearningRate.example(target);
    return (<div class={styles.root}>
      <KeyDetailsChart lessonKey={lessonKey} learningRate={learningRate} width="100%" height="15rem"/>
    </div>);
}
