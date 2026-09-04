import { type BooksLesson, type CustomTextLesson, type Lesson, lessonProps, LessonType, type WordListLesson, } from "@keybr/lesson";
import { LessonLoader } from "@keybr/lesson-loader";
import { type Settings, useSettings } from "@keybr/settings";
import { SegmentedControl } from "@keybr/widget";
import { type ReactNode } from "@keybr/solid-compat/react";
import { useIntl } from "@keybr/solid-compat/intl";
import { BooksLessonSettings } from "./lesson/BooksLessonSettings.tsx";
import { CodeLessonSettings } from "./lesson/CodeLessonSettings.tsx";
import { CustomTextLessonSettings } from "./lesson/CustomTextLessonSettings.tsx";
import { DailyGoalSettings } from "./lesson/DailyGoalSettings.tsx";
import { GuidedLessonSettings } from "./lesson/GuidedLessonSettings.tsx";
import { LessonPreview } from "./lesson/LessonPreview.tsx";
import { NumbersLessonSettings } from "./lesson/NumbersLessonSettings.tsx";
import { WordListLessonSettings } from "./lesson/WordListLessonSettings.tsx";

const lessonTypes = [
  LessonType.GUIDED,
  LessonType.WORDLIST,
  LessonType.BOOKS,
  LessonType.CUSTOM,
  LessonType.CODE,
  LessonType.NUMBERS,
] as const;

export function LessonSettings(): ReactNode {
  const { formatMessage } = useIntl();
  const { settings, updateSettings } = useSettings();
  let lessonBody!: HTMLDivElement;
  let switching = false;

  const waitForLesson = (type: LessonType) => new Promise<void>((resolve) => {
    const ready = () => lessonBody.querySelector(`[data-keybr-lesson-type="${type.id}"]`) != null;
    if (ready()) { resolve(); return; }
    const observer = new MutationObserver(() => {
      if (!ready()) return;
      clearTimeout(timeout);
      observer.disconnect();
      resolve();
    });
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 3000);
    observer.observe(lessonBody, { childList: true, subtree: true });
  });

  const changeLessonType = (value: LessonType) => {
    const current = settings.get(lessonProps.type);
    if (switching || value === current) return;
    const from = lessonTypes.indexOf(current);
    const to = lessonTypes.indexOf(value);
    const direction = to < from ? "back" : "forward";
    const commit = async () => {
      updateSettings(settings.set(lessonProps.type, value));
      await waitForLesson(value);
    };
    const animate = globalThis.SameyAnimateLocalSwap;
    if (!animate) { void commit(); return; }
    switching = true;
    void animate(lessonBody, commit, direction)
      .catch((error) => console.error("Lesson type transition failed", error))
      .finally(() => { switching = false; });
  };

  return <>
    <SegmentedControl
      label="Lesson type"
      comfortable
      value={settings.get(lessonProps.type)}
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
    <div ref={lessonBody} class="keybr-lesson-settings-body">
      <LessonLoader>
        {(lesson) => <div data-keybr-lesson-type={settings.get(lessonProps.type).id}>
          {tabBody(settings, lesson)}
          <LessonPreview lesson={lesson}/>
        </div>}
      </LessonLoader>
    </div>
    <DailyGoalSettings />
  </>;
}

function tabBody(settings: Settings, lesson: Lesson): ReactNode {
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
