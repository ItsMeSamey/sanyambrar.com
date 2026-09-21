import type { JSX } from "@solidjs/web";
import { type BooksLesson } from "../../lesson/books.ts";
import { type CustomTextLesson } from "../../lesson/customtext.ts";
import { type Lesson } from "../../lesson/lesson.ts";
import { lessonProps } from "../../lesson/settings.ts";
import { LessonType } from "../../lesson/lessontype.ts";
import { type WordListLesson } from "../../lesson/wordlist.ts";
import { LessonLoader } from "../../lesson/loader.tsx";
import { type Settings } from "../../settings/settings.ts";
import { useSettings } from "../../settings/context.ts";
import { SegmentedControl } from "../../widget/components/segmented/SegmentedControl.tsx";
import { createEffect, createSignal, onCleanup } from "solid-js";

import { useIntl } from "../../intl/runtime.tsx";
import { BooksLessonSettings } from "./lesson/BooksLessonSettings.tsx";
import { CodeLessonSettings } from "./lesson/CodeLessonSettings.tsx";
import { CustomTextLessonSettings } from "./lesson/CustomTextLessonSettings.tsx";
import { DailyGoalSettings } from "./lesson/DailyGoalSettings.tsx";
import { GuidedLessonSettings } from "./lesson/GuidedLessonSettings.tsx";
import { LessonPreview } from "./lesson/LessonPreview.tsx";
import { NumbersLessonSettings } from "./lesson/NumbersLessonSettings.tsx";
import { WordListLessonSettings } from "./lesson/WordListLessonSettings.tsx";

export function LessonSettings(): JSX.Element {
  const { formatMessage } = useIntl();
  const { settings, updateSettings } = useSettings();
  const committedType = () => settings.get(lessonProps.type);
  const [selectedType, setSelectedType] = createSignal(committedType());
  createEffect(committedType, value => { setSelectedType(value); });
  let commitFrame = 0;

  const commitSelectedType = () => {
    if (commitFrame) cancelAnimationFrame(commitFrame);
    commitFrame = requestAnimationFrame(() => {
      commitFrame = requestAnimationFrame(() => {
        commitFrame = 0;
        const value = selectedType();
        if (value !== committedType()) updateSettings(settings.set(lessonProps.type, value));
      });
    });
  };
  onCleanup(() => { if (commitFrame) cancelAnimationFrame(commitFrame); });

  const changeLessonType = (value: LessonType) => {
    if (value === selectedType()) return;
    setSelectedType(value);
    commitSelectedType();
  };

  return <>
    <SegmentedControl
      label="Lesson type"
      comfortable
      value={selectedType()}
      options={[
        { value: LessonType.GUIDED, label: formatMessage({ id: "t_Guided_lessons", defaultMessage: "Guided lessons" }) },
        { value: LessonType.WORDLIST, label: formatMessage({ id: "t_Common_words", defaultMessage: "Common words" }) },
        { value: LessonType.BOOKS, label: formatMessage({ id: "t_Books", defaultMessage: "Books" }) },
        { value: LessonType.CUSTOM, label: formatMessage({ id: "t_Custom_text", defaultMessage: "Custom text" }) },
        { value: LessonType.CODE, label: formatMessage({ id: "t_Source_code", defaultMessage: "Source code" }) },
        { value: LessonType.NUMBERS, label: formatMessage({ id: "t_Numbers", defaultMessage: "Numbers" }) },
      ]}
      onChange={changeLessonType}
    />
    <div class="keybr-lesson-settings-body">
      <LessonLoader>
        {(lesson) => <div data-keybr-lesson-type={committedType().id}>
          {tabBody(settings, lesson)}
          <LessonPreview lesson={lesson}/>
        </div>}
      </LessonLoader>
    </div>
    <DailyGoalSettings />
  </>;
}

function tabBody(settings: Settings, lesson: Lesson): JSX.Element {
  switch (settings.get(lessonProps.type)) {
    case LessonType.GUIDED:
      return <GuidedLessonSettings/>;
    case LessonType.WORDLIST:
      return <WordListLessonSettings lesson={lesson as WordListLesson}/>;
    case LessonType.BOOKS:
      return <BooksLessonSettings lesson={lesson as BooksLesson}/>;
    case LessonType.CUSTOM:
      return <CustomTextLessonSettings lesson={lesson as CustomTextLesson}/>;
    case LessonType.CODE:
      return <CodeLessonSettings/>;
    case LessonType.NUMBERS:
      return <NumbersLessonSettings/>;
    default:
      throw new Error();
  }
}
