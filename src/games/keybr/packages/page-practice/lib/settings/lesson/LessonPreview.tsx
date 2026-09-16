import type { JSX } from "@solidjs/web";
import { BooksLesson, type Lesson } from "@keybr/lesson";
import { CurrentKeyRow, KeySetRow } from "@keybr/lesson-ui";
import { LCG } from "@keybr/rand";
import { makeKeyStatsMap, useResults } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import { TextInput, toTextDisplaySettings, toTextInputSettings, } from "@keybr/textinput";
import { StaticText } from "@keybr/textinput-ui";
import { FieldSet } from "@keybr/widget";
import { createMemo } from "solid-js";
import { useIntl } from "@keybr/intl";
import * as styles from "./LessonPreview.module.css";
export function LessonPreview(solidProps: {
    readonly lesson: Lesson;
}): JSX.Element {
    const { formatMessage } = useIntl();
    const { settings } = useSettings();
    const { results } = useResults();
    const preview = createMemo(() => {
        const lessonKeys = solidProps.lesson.update(makeKeyStatsMap(solidProps.lesson.letters, solidProps.lesson.filter(results())));
        const text = solidProps.lesson instanceof BooksLesson
            ? solidProps.lesson.generatePreview()
            : solidProps.lesson.generate(lessonKeys, LCG(123));
        const textInput = new TextInput(text, toTextInputSettings(settings));
        return { lessonKeys, textInput };
    });
    return (<FieldSet legend={formatMessage({
            id: "t_Lesson_preview:",
            defaultMessage: "Lesson preview",
        })}>
      <div class={styles.root}>
        <KeySetRow lessonKeys={preview().lessonKeys}/>
        <CurrentKeyRow lessonKeys={preview().lessonKeys}/>
        <div class={styles.text}>
          <StaticText settings={toTextDisplaySettings(settings)} lines={preview().textInput.lines}/>
        </div>
      </div>
    </FieldSet>);
}
