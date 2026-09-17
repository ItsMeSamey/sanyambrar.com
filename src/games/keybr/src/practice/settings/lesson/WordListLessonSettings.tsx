import type { JSX } from "@solidjs/web";
import { wordListStats } from "../../../content/words/stats.ts";
import { useIntlNumbers } from "../../../intl/numbers.ts";
import { lessonProps } from "../../../lesson/settings.ts";
import { type WordListLesson } from "../../../lesson/wordlist.ts";
import { useSettings } from "../../../settings/context.ts";
import { Toggle } from "../../../widget/components/toggle/Toggle.tsx";
import { Description } from "../../../widget/components/text/Description.tsx";
import { Explainer } from "../../../widget/components/explainer/Explainer.tsx";
import { Field, FieldList } from "../../../widget/components/fieldlist/FieldList.tsx";
import { FieldSet } from "../../../widget/components/form/Form.tsx";
import { NameValue } from "../../../widget/components/text/NameValue.tsx";
import { Para } from "../../../widget/components/text/Para.tsx";
import { Range } from "../../../widget/components/range/Range.tsx";
import { TextField } from "../../../widget/components/textfield/TextField.tsx";

import { createMemo } from 'solid-js';
import { FormattedMessage, useIntl } from "../../../intl/runtime.tsx";
import { LessonLengthProp } from "./LessonLengthProp.tsx";
import { RepeatWordsProp } from "./RepeatWordsProp.tsx";
import { TargetSpeedProp } from "./TargetSpeedProp.tsx";
import { TextManglingProp } from "./TextManglingProp.tsx";
export function WordListLessonSettings(props: {
    readonly lesson: WordListLesson;
}): JSX.Element {
    const { formatMessage } = useIntl();
    return (<>
      <Explainer>
        <Description>
          <FormattedMessage id="lessonType.wordList.description" defaultMessage="Generate typing lessons from the list of the most common words of your language. All keys are included by default. This mode is for the pros."/>
        </Description>
      </Explainer>
      <FieldSet legend={formatMessage({
            id: "t_Lesson_options",
            defaultMessage: "Lesson options",
        })}>
        <WordListPreview lesson={props.lesson}/>
        <WordListStats lesson={props.lesson}/>
        <TargetSpeedProp />
        <RepeatWordsProp />
        <TextManglingProp />
        <LessonLengthProp />
      </FieldSet>
    </>);
}
function WordListPreview(props: {
    readonly lesson: WordListLesson;
}): JSX.Element {
    const { formatMessage } = useIntl();
    const { settings, updateSettings } = useSettings();
    return (<>
      <FieldList>
        <Field>
          <FormattedMessage id="t_Word_list_size:" defaultMessage="Word list size:"/>
        </Field>
        <Field>
          <Range size={16} min={lessonProps.wordList.wordListSize.min} max={lessonProps.wordList.wordListSize.max} step={1} value={settings.get(lessonProps.wordList.wordListSize)} onChange={(value) => {
            updateSettings(settings.set(lessonProps.wordList.wordListSize, value));
        }}/>
        </Field>
        <Field>
          <Toggle label={formatMessage({
            id: "t_Long_words_only",
            defaultMessage: "Long words only",
        })} checked={settings.get(lessonProps.wordList.longWordsOnly)} onChange={(value) => {
            updateSettings(settings.set(lessonProps.wordList.longWordsOnly, value));
        }}/>
        </Field>
      </FieldList>
      <Para>
        <TextField type="textarea" value={[...props.lesson.wordList].join(", ")} readOnly={true}/>
      </Para>
    </>);
}
function WordListStats(props: {
    readonly lesson: WordListLesson;
}): JSX.Element {
    const { formatMessage } = useIntl();
    const { formatNumber } = useIntlNumbers();
    const stats = createMemo(() => wordListStats(props.lesson.wordList));
    return (<FieldList>
      <Field>
        <NameValue name={formatMessage({
            id: "t_num_Unique_words",
            defaultMessage: "Unique words",
        })} value={formatNumber(stats().wordCount)}/>
      </Field>
      <Field>
        <NameValue name={formatMessage({
            id: "t_Average_word_length",
            defaultMessage: "Average word length",
        })} value={formatNumber(stats().avgWordLength, 2)}/>
      </Field>
    </FieldList>);
}
