import type { JSX } from "@solidjs/web";
import { BooksLesson } from "../../../lesson/books.ts";
import { type Lesson } from "../../../lesson/lesson.ts";
import { CurrentKeyRow, KeySetRow } from "../../../lesson-ui/indicators.tsx";
import { LCG } from "../../../rand/rng/lcg.ts";
import { makeKeyStatsMap } from "../../../result/keystats.ts";
import { useResults } from "../../../result/context.ts";
import { useSettings } from "../../../settings/context.ts";
import { TextInput } from "../../../textinput/textinput.ts";
import { toTextDisplaySettings, toTextInputSettings } from "../../../textinput/settings.ts";
import { StaticText } from "../../../textinput-ui/StaticText.tsx";
import { FieldSet } from "../../../widget/components/form/Form.tsx";
import { createMemo } from "solid-js";
import { useIntl } from "../../../intl/runtime.tsx";
import styles from "./LessonPreview.module.css";
export function LessonPreview(props: {
    readonly lesson: Lesson;
}): JSX.Element {
    const { formatMessage } = useIntl();
    const { settings } = useSettings();
    const { results } = useResults();
    const preview = createMemo(() => {
        const lessonKeys = props.lesson.update(makeKeyStatsMap(props.lesson.letters, props.lesson.filter(results())));
        const text = props.lesson instanceof BooksLesson
            ? props.lesson.generatePreview()
            : props.lesson.generate(lessonKeys, LCG(123));
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
