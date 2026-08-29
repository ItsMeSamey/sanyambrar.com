import { type Lesson } from "@keybr/lesson";
import { CurrentKeyRow, KeySetRow } from "@keybr/lesson-ui";
import { LCG } from "@keybr/rand";
import { makeKeyStatsMap, useResults } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import { TextInput, toTextDisplaySettings, toTextInputSettings, } from "@keybr/textinput";
import { StaticText } from "@keybr/textinput-ui";
import { FieldSet } from "@keybr/widget";
import { type ReactNode, useMemo } from "@keybr/solid-compat/react";
import { useIntl } from "@keybr/solid-compat/intl";
import * as styles from "./LessonPreview.module.css";
export function LessonPreview(solidProps: {
    readonly lesson: Lesson;
}): ReactNode {
    const { formatMessage } = useIntl();
    const { settings } = useSettings();
    const { results } = useResults();
    const preview = useMemo(() => {
        const lessonKeys = solidProps.lesson.update(makeKeyStatsMap(solidProps.lesson.letters, solidProps.lesson.filter(results)));
        const textInput = new TextInput(solidProps.lesson.generate(lessonKeys, LCG(123)), toTextInputSettings(settings));
        return { lessonKeys, textInput };
    }, () => [settings, solidProps.lesson, results]);
    return (<FieldSet legend={formatMessage({
            id: "t_Lesson_preview:",
            defaultMessage: "Lesson preview",
        })}>
      <div class={styles.root}>
        <KeySetRow lessonKeys={preview.lessonKeys}/>
        <CurrentKeyRow lessonKeys={preview.lessonKeys}/>
        <div class={styles.text}>
          <StaticText settings={toTextDisplaySettings(settings)} lines={preview.textInput.lines}/>
        </div>
      </div>
    </FieldSet>);
}
